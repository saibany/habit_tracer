import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as GamificationService from '../lib/gamificationService';
import prisma from '../utils/prisma';

/**
 * GET /badges - Get all badges with user's progress
 */
export const getBadges = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const badges = await GamificationService.getUserBadges(req.user.userId);

        // Group badges by category for better UI organization
        const byCategory = badges.reduce((acc, badge) => {
            if (!acc[badge.category]) acc[badge.category] = [];
            acc[badge.category].push(badge);
            return acc;
        }, {} as Record<string, typeof badges>);

        res.json({
            badges,
            byCategory,
            stats: {
                total: badges.length,
                earned: badges.filter(b => b.state === 'earned').length,
                inProgress: badges.filter(b => b.state === 'in_progress').length,
            }
        });
    } catch (e) {
        console.error('[Badges] Error fetching badges:', e);
        res.status(500).json({ error: 'Failed to fetch badges' });
    }
};

/**
 * GET /badges/recent - Get recently earned badges (last 7 days)
 */
export const getRecentBadges = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const recent = await GamificationService.getRecentlyEarnedBadges(req.user.userId);
        res.json({
            badges: recent.map(ub => ({
                id: ub.badge.id,
                name: ub.badge.name,
                description: ub.badge.description,
                icon: ub.badge.icon,
                color: ub.badge.color,
                tier: ub.badge.tier,
                rarity: ub.badge.rarity,
                xpReward: ub.badge.xpReward,
                earnedAt: ub.earnedAt,
            }))
        });
    } catch (e) {
        console.error('[Badges] Error fetching recent badges:', e);
        res.status(500).json({ error: 'Failed to fetch recent badges' });
    }
};

/**
 * GET /badges/:id - Get single badge detail
 */
export const getBadgeDetail = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const [badge, userBadge] = await Promise.all([
            prisma.badge.findUnique({ where: { id } }),
            prisma.userBadge.findUnique({ where: { userId_badgeId: { userId: req.user.userId, badgeId: id } } })
        ]);

        if (!badge) return res.status(404).json({ error: 'Badge not found' });

        // Get tier progression info
        const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
        const currentTierIndex = tierOrder.indexOf(badge.tier);

        res.json({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            category: badge.category,
            tier: badge.tier,
            tierIndex: currentTierIndex,
            rarity: badge.rarity,
            threshold: badge.threshold,
            xpReward: badge.xpReward,
            icon: badge.icon,
            color: badge.color,
            state: userBadge?.state || 'locked',
            progress: userBadge?.progress || 0,
            earnedAt: userBadge?.earnedAt || null,
            progressPercent: Math.round(((userBadge?.progress || 0) / badge.threshold) * 100),
        });
    } catch (e) {
        console.error('[Badges] Error fetching badge detail:', e);
        res.status(500).json({ error: 'Failed to fetch badge details' });
    }
};

/**
 * GET /badges/next-goal - Get the closest badge to earn
 */
export const getNextGoal = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const badges = await GamificationService.getUserBadges(req.user.userId);

        // Find badges that are in progress or locked, sorted by how close they are to completion
        const unearned = badges
            .filter(b => b.state !== 'earned')
            .map(b => ({
                ...b,
                progressPercent: Math.round((b.progress / b.threshold) * 100),
                remaining: b.threshold - b.progress
            }))
            .sort((a, b) => b.progressPercent - a.progressPercent);

        // Get the top 3 closest to completion
        const nextGoals = unearned.slice(0, 3);

        res.json({
            nextGoals,
            totalRemaining: unearned.length
        });
    } catch (e) {
        console.error('[Badges] Error fetching next goal:', e);
        res.status(500).json({ error: 'Failed to fetch next goal' });
    }
};
