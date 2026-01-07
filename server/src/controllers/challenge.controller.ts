import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import * as GamificationService from '../lib/gamificationService';
import prisma from '../utils/prisma';

const createChallengeSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(1000).optional(),
    targetType: z.enum(['daily_completions', 'streak_days', 'xp_gain', 'total_completions', 'perfect_week']),
    targetValue: z.number().min(1).max(365),
    difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']).default('medium'),
    xpReward: z.number().min(0).max(1000).default(50),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
});

/**
 * POST /challenges - Create a new challenge
 */
export const createChallenge = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const validated = createChallengeSchema.parse(req.body);

        // Determine status based on start date
        const now = new Date();
        const startDate = new Date(validated.startDate);
        const status = startDate > now ? 'upcoming' : 'active';

        const challenge = await prisma.challenge.create({
            data: {
                ...validated,
                createdBy: req.user.userId,
                type: 'group',
                status,
                isActive: true
            }
        });

        // Creator automatically joins
        await GamificationService.joinChallenge(req.user.userId, challenge.id);

        res.status(201).json(challenge);
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: e.errors });
        }
        console.error('[Challenges] Error creating challenge:', e);
        res.status(500).json({ error: 'Failed to create challenge' });
    }
};

/**
 * GET /challenges - List all active challenges with user's status
 */
export const listChallenges = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        await GamificationService.processExpiredChallenges();
        const challenges = await GamificationService.getChallenges(req.user.userId);

        // Calculate time remaining for active challenges
        const now = Date.now();
        const enrichedChallenges = challenges.map(ch => ({
            ...ch,
            timeRemaining: ch.endDate ? Math.max(0, new Date(ch.endDate).getTime() - now) : null,
            daysRemaining: ch.endDate ? Math.max(0, Math.ceil((new Date(ch.endDate).getTime() - now) / (24 * 60 * 60 * 1000))) : null,
            progressPercent: Math.min(100, Math.round((ch.progress / ch.targetValue) * 100)),
        }));

        res.json({
            challenges: enrichedChallenges,
            stats: {
                active: enrichedChallenges.filter(c => c.status === 'active').length,
                joined: enrichedChallenges.filter(c => c.joined).length,
                completed: enrichedChallenges.filter(c => c.participantState === 'completed').length,
            }
        });
    } catch (e) {
        console.error('[Challenges] Error listing challenges:', e);
        res.status(500).json({ error: 'Failed to fetch challenges' });
    }
};

/**
 * POST /challenges/:id/join - Join a challenge
 */
export const joinChallenge = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        await GamificationService.joinChallenge(req.user.userId, id);
        res.json({ success: true, message: 'Joined challenge successfully' });
    } catch (e: any) {
        console.error('[Challenges] Error joining challenge:', e);
        if (e.message?.includes('not found') || e.message?.includes('not active')) {
            return res.status(400).json({ error: e.message });
        }
        res.status(500).json({ error: 'Failed to join challenge' });
    }
};

/**
 * POST /challenges/:id/leave - Leave a challenge
 */
export const leaveChallenge = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        await GamificationService.leaveChallenge(req.user.userId, id);
        res.json({ success: true, message: 'Left challenge successfully' });
    } catch (e) {
        console.error('[Challenges] Error leaving challenge:', e);
        res.status(500).json({ error: 'Failed to leave challenge' });
    }
};

/**
 * GET /challenges/:id/leaderboard - Get challenge leaderboard
 */
export const challengeLeaderboard = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const leaderboard = await GamificationService.getChallengeLeaderboard(id, req.user.userId);

        // Find current user's position
        const userEntry = leaderboard.find(e => e.isCurrentUser);

        res.json({
            leaderboard,
            userRank: userEntry?.rank || null,
            totalParticipants: leaderboard.length,
        });
    } catch (e) {
        console.error('[Challenges] Error fetching leaderboard:', e);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};



/**
 * GET /challenges/history - Get user's completed/failed challenges
 */
export const getChallengeHistory = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    try {
        const [participants, total] = await Promise.all([
            prisma.challengeParticipant.findMany({
                where: {
                    userId: req.user.userId,
                    state: { in: ['completed', 'withdrawn'] }
                },
                include: {
                    challenge: true
                },
                orderBy: { updatedAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.challengeParticipant.count({
                where: {
                    userId: req.user.userId,
                    state: { in: ['completed', 'withdrawn'] }
                }
            })
        ]);

        const history = participants.map(p => ({
            id: p.challenge.id,
            title: p.challenge.title,
            description: p.challenge.description,
            type: p.challenge.type,
            targetType: p.challenge.targetType,
            targetValue: p.challenge.targetValue,
            difficulty: p.challenge.difficulty,
            xpReward: p.challenge.xpReward,
            state: p.state,
            progress: p.progress,
            progressPercent: Math.round((p.progress / p.challenge.targetValue) * 100),
            joinedAt: p.joinedAt,
            completedAt: p.completedAt,
            startDate: p.challenge.startDate,
            endDate: p.challenge.endDate
        }));

        res.json({
            history,
            total,
            limit,
            offset,
            hasMore: offset + participants.length < total
        });
    } catch (e) {
        console.error('[Challenges] Error fetching history:', e);
        res.status(500).json({ error: 'Failed to fetch challenge history' });
    }
};

/**
 * GET /challenges/:id - Get single challenge detail
 */
export const getChallengeDetail = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const challenge = await prisma.challenge.findUnique({
            where: { id },
            include: {
                participants: { where: { userId: req.user.userId } },
                _count: { select: { participants: true } }
            }
        });

        if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

        const participant = challenge.participants[0];
        const now = Date.now();

        res.json({
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            type: challenge.type,
            targetType: challenge.targetType,
            targetValue: challenge.targetValue,
            status: challenge.status,
            difficulty: challenge.difficulty,
            xpReward: challenge.xpReward,
            badgeReward: challenge.badgeReward,
            startDate: challenge.startDate,
            endDate: challenge.endDate,
            participantCount: challenge._count.participants,
            joined: Boolean(participant),
            participantState: participant?.state || null,
            progress: participant?.progress || 0,
            progressPercent: participant ? Math.round((participant.progress / challenge.targetValue) * 100) : 0,
            completedAt: participant?.completedAt || null,
            timeRemaining: challenge.endDate ? Math.max(0, new Date(challenge.endDate).getTime() - now) : null,
            daysRemaining: challenge.endDate ? Math.max(0, Math.ceil((new Date(challenge.endDate).getTime() - now) / (24 * 60 * 60 * 1000))) : null,
        });
    } catch (e) {
        console.error('[Challenges] Error fetching challenge detail:', e);
        res.status(500).json({ error: 'Failed to fetch challenge details' });
    }
};

