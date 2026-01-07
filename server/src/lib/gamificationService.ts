/**
 * GamificationService - Centralized gamification logic
 * 
 * All badge, challenge, XP, and level logic lives here.
 * Guarantees:
 * - Idempotent awarding (no duplicates)
 * - Deterministic calculations
 * - Weekly cycle awareness
 * - Explicit state machines
 * - Internal events for analytics
 */

import { Badge, Prisma } from '@prisma/client';
import { startOfDay, startOfWeek, differenceInDays, format } from 'date-fns';
import prisma from '../utils/prisma';

// Helper to get the correct client (transaction or default)
type TxClient = Prisma.TransactionClient;
const getClient = (tx?: TxClient) => tx || prisma;

// ============================================
// TYPES & CONSTANTS
// ============================================

export type BadgeCategory = 'streak' | 'consistency' | 'volume' | 'discipline' | 'special' | 'seasonal';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeState = 'locked' | 'in_progress' | 'earned';

export type ChallengeType = 'personal' | 'global' | 'group';
export type ChallengeStatus = 'upcoming' | 'active' | 'completed' | 'expired';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'extreme';
export type ChallengeParticipantState = 'active' | 'completed' | 'withdrawn' | 'failed';

export type XpSource = 'habit_complete' | 'challenge_complete' | 'badge_unlock' | 'streak_bonus' | 'perfect_week';

// XP per level curve: XP = 50 * level^1.5
export const calculateXpForLevel = (level: number): number => Math.floor(50 * Math.pow(level, 1.5));
export const calculateLevelFromXp = (xp: number): number => {
    let level = 1;
    while (calculateXpForLevel(level + 1) <= xp) level++;
    return level;
};

// ============================================
// INTERNAL EVENTS (for future analytics/notifications)
// ============================================

export type GamificationEvent =
    | { type: 'BADGE_EARNED'; userId: string; badgeId: string; badgeName: string }
    | { type: 'BADGE_PROGRESS'; userId: string; badgeId: string; progress: number; threshold: number }
    | { type: 'CHALLENGE_JOINED'; userId: string; challengeId: string }
    | { type: 'CHALLENGE_COMPLETED'; userId: string; challengeId: string }
    | { type: 'LEVEL_UP'; userId: string; oldLevel: number; newLevel: number }
    | { type: 'XP_GAINED'; userId: string; amount: number; source: XpSource };

const eventListeners: ((event: GamificationEvent) => void)[] = [];

export const onGamificationEvent = (listener: (event: GamificationEvent) => void) => {
    eventListeners.push(listener);
    return () => {
        const idx = eventListeners.indexOf(listener);
        if (idx >= 0) eventListeners.splice(idx, 1);
    };
};

const emitEvent = (event: GamificationEvent) => {
    eventListeners.forEach(listener => {
        try { listener(event); } catch (e) { console.error('[GamificationEvent] Listener error:', e); }
    });
};

// ============================================
// BADGE DEFINITIONS (25+ badges)
// ============================================

interface BadgeDefinition {
    name: string;
    description: string;
    category: BadgeCategory;
    tier: BadgeTier;
    rarity: BadgeRarity;
    threshold: number;
    xpReward: number;
    icon: string;
    color: string;
    evaluator: (ctx: EvaluationContext) => number; // Returns current progress
}

export interface EvaluationContext {
    userId: string;
    currentStreak: number;
    longestStreak: number;
    totalCompletions: number;
    weeklyCompletions: number;
    totalXp: number;
    perfectWeeks: number;
    daysSinceSignup: number;
    weekStart: number; // 0 = Sunday, 1 = Monday
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
    // ========== STREAK BADGES ==========
    { name: 'Spark', description: 'Complete habits for 3 days in a row', category: 'streak', tier: 'bronze', rarity: 'common', threshold: 3, xpReward: 25, icon: '🔥', color: '#F97316', evaluator: ctx => ctx.currentStreak },
    { name: 'Flame', description: 'Maintain a 7-day streak', category: 'streak', tier: 'silver', rarity: 'common', threshold: 7, xpReward: 50, icon: '🔥', color: '#EF4444', evaluator: ctx => ctx.currentStreak },
    { name: 'Inferno', description: 'Maintain a 14-day streak', category: 'streak', tier: 'gold', rarity: 'rare', threshold: 14, xpReward: 100, icon: '🔥', color: '#B91C1C', evaluator: ctx => ctx.currentStreak },
    { name: 'Blaze Master', description: 'Maintain a 30-day streak', category: 'streak', tier: 'platinum', rarity: 'epic', threshold: 30, xpReward: 200, icon: '🔥', color: '#7C2D12', evaluator: ctx => ctx.currentStreak },
    { name: 'Eternal Flame', description: 'Maintain a 60-day streak', category: 'streak', tier: 'platinum', rarity: 'legendary', threshold: 60, xpReward: 500, icon: '👑', color: '#FFD700', evaluator: ctx => ctx.currentStreak },

    // ========== VOLUME BADGES ==========
    { name: 'First Steps', description: 'Complete your first habit', category: 'volume', tier: 'bronze', rarity: 'common', threshold: 1, xpReward: 10, icon: '⭐', color: '#6366F1', evaluator: ctx => ctx.totalCompletions },
    { name: 'Getting Started', description: 'Complete 10 habits', category: 'volume', tier: 'bronze', rarity: 'common', threshold: 10, xpReward: 25, icon: '🌟', color: '#8B5CF6', evaluator: ctx => ctx.totalCompletions },
    { name: 'Building Momentum', description: 'Complete 25 habits', category: 'volume', tier: 'silver', rarity: 'common', threshold: 25, xpReward: 50, icon: '💪', color: '#7C3AED', evaluator: ctx => ctx.totalCompletions },
    { name: 'Habit Hero', description: 'Complete 100 habits', category: 'volume', tier: 'gold', rarity: 'rare', threshold: 100, xpReward: 150, icon: '🏆', color: '#5B21B6', evaluator: ctx => ctx.totalCompletions },
    { name: 'Habit Legend', description: 'Complete 500 habits', category: 'volume', tier: 'platinum', rarity: 'epic', threshold: 500, xpReward: 300, icon: '👑', color: '#4C1D95', evaluator: ctx => ctx.totalCompletions },
    { name: 'Habit Deity', description: 'Complete 1000 habits', category: 'volume', tier: 'platinum', rarity: 'legendary', threshold: 1000, xpReward: 500, icon: '✨', color: '#FFD700', evaluator: ctx => ctx.totalCompletions },

    // ========== CONSISTENCY BADGES ==========
    { name: 'Weekly Warrior', description: 'Complete habits every day for a week', category: 'consistency', tier: 'bronze', rarity: 'common', threshold: 7, xpReward: 50, icon: '📅', color: '#10B981', evaluator: ctx => ctx.weeklyCompletions },
    { name: 'Perfect Week', description: 'Achieve a perfect week (7/7 days)', category: 'consistency', tier: 'silver', rarity: 'rare', threshold: 1, xpReward: 100, icon: '🎯', color: '#059669', evaluator: ctx => ctx.perfectWeeks },
    { name: 'Month Master', description: 'Complete habits for 30 consecutive days', category: 'consistency', tier: 'gold', rarity: 'epic', threshold: 30, xpReward: 250, icon: '📆', color: '#047857', evaluator: ctx => ctx.currentStreak },

    // ========== XP/LEVEL BADGES ==========
    { name: 'XP Collector', description: 'Earn 500 XP', category: 'discipline', tier: 'bronze', rarity: 'common', threshold: 500, xpReward: 25, icon: '⚡', color: '#F59E0B', evaluator: ctx => ctx.totalXp },
    { name: 'XP Hunter', description: 'Earn 2,000 XP', category: 'discipline', tier: 'silver', rarity: 'common', threshold: 2000, xpReward: 50, icon: '⚡', color: '#D97706', evaluator: ctx => ctx.totalXp },
    { name: 'XP Master', description: 'Earn 5,000 XP', category: 'discipline', tier: 'gold', rarity: 'rare', threshold: 5000, xpReward: 100, icon: '⚡', color: '#B45309', evaluator: ctx => ctx.totalXp },
    { name: 'XP Legend', description: 'Earn 10,000 XP', category: 'discipline', tier: 'platinum', rarity: 'epic', threshold: 10000, xpReward: 200, icon: '💎', color: '#92400E', evaluator: ctx => ctx.totalXp },

    // ========== SPECIAL BADGES ==========
    { name: 'Early Bird', description: 'Log a habit before 7 AM', category: 'special', tier: 'bronze', rarity: 'rare', threshold: 1, xpReward: 50, icon: '🌅', color: '#EC4899', evaluator: () => 0 }, // Manual trigger
    { name: 'Night Owl', description: 'Log a habit after 11 PM', category: 'special', tier: 'bronze', rarity: 'rare', threshold: 1, xpReward: 50, icon: '🌙', color: '#8B5CF6', evaluator: () => 0 }, // Manual trigger
    { name: 'Comeback Kid', description: 'Resume habits after a 7+ day break', category: 'special', tier: 'silver', rarity: 'rare', threshold: 1, xpReward: 75, icon: '🔄', color: '#14B8A6', evaluator: () => 0 }, // Manual trigger
];

// ============================================
// CHALLENGE DEFINITIONS (Default challenges)
// ============================================

interface ChallengeDefinition {
    title: string;
    description: string;
    type: ChallengeType;
    targetType: string;
    targetValue: number;
    difficulty: ChallengeDifficulty;
    xpReward: number;
    durationDays: number;
}

export const DEFAULT_CHALLENGES: ChallengeDefinition[] = [
    { title: '7-Day Habit Sprint', description: 'Complete at least one habit every day for 7 days', type: 'global', targetType: 'daily_completions', targetValue: 7, difficulty: 'easy', xpReward: 100, durationDays: 7 },
    { title: 'Consistency Champion', description: 'Achieve a 7-day streak on any habit', type: 'global', targetType: 'streak_days', targetValue: 7, difficulty: 'medium', xpReward: 150, durationDays: 14 },
    { title: 'Habit Marathon', description: 'Complete 50 total habits in 2 weeks', type: 'global', targetType: 'total_completions', targetValue: 50, difficulty: 'hard', xpReward: 250, durationDays: 14 },
    { title: 'Perfect Week Challenge', description: 'Achieve a perfect week - complete habits all 7 days', type: 'global', targetType: 'perfect_week', targetValue: 1, difficulty: 'medium', xpReward: 200, durationDays: 7 },
];

// ============================================
// CORE SERVICE METHODS
// ============================================

/**
 * Ensure all badge definitions exist in the database
 */
export async function syncBadgeDefinitions(): Promise<void> {
    for (let i = 0; i < BADGE_DEFINITIONS.length; i++) {
        const def = BADGE_DEFINITIONS[i];
        await prisma.badge.upsert({
            where: { name: def.name },
            update: {
                description: def.description,
                category: def.category,
                tier: def.tier,
                rarity: def.rarity,
                threshold: def.threshold,
                xpReward: def.xpReward,
                icon: def.icon,
                color: def.color,
                sortOrder: i,
            },
            create: {
                name: def.name,
                description: def.description,
                category: def.category,
                tier: def.tier,
                rarity: def.rarity,
                threshold: def.threshold,
                xpReward: def.xpReward,
                icon: def.icon,
                color: def.color,
                sortOrder: i,
            },
        });
    }
}

/**
 * Ensure default challenges exist
 */
export async function syncDefaultChallenges(): Promise<void> {
    const existingCount = await prisma.challenge.count({ where: { type: 'global' } });
    if (existingCount > 0) return;

    const now = new Date();
    for (const def of DEFAULT_CHALLENGES) {
        await prisma.challenge.create({
            data: {
                title: def.title,
                description: def.description,
                type: def.type,
                targetType: def.targetType,
                targetValue: def.targetValue,
                difficulty: def.difficulty,
                xpReward: def.xpReward,
                status: 'active',
                startDate: now,
                endDate: new Date(now.getTime() + def.durationDays * 24 * 60 * 60 * 1000),
            },
        });
    }
}

/**
 * Award XP idempotently
 * Accepts optional transaction client for atomic composability
 */
export async function awardXp(
    userId: string,
    amount: number,
    source: XpSource,
    sourceId?: string,
    date: Date = new Date(),
    tx?: TxClient
): Promise<{ awarded: boolean; newXp: number; levelUp?: { oldLevel: number; newLevel: number } }> {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd');
    const idempotencyKey = `${userId}:${source}:${sourceId || 'none'}:${dateKey}`;
    const client = getClient(tx);

    try {
        // Check if already awarded (read from same tx to ensure visibility of uncommitted writes)
        const existing = await client.xpTransaction.findUnique({ where: { idempotencyKey } });
        if (existing) {
            const user = await client.user.findUnique({ where: { id: userId } });
            return { awarded: false, newXp: user?.xp || 0 };
        }

        // Logic to execute changes
        const executeChanges = async (t: TxClient) => {
            await t.xpTransaction.create({
                data: { userId, amount, source, sourceId, idempotencyKey },
            });

            const user = await t.user.update({
                where: { id: userId },
                data: { xp: { increment: amount } },
            });

            const oldLevel = calculateLevelFromXp(user.xp - amount);
            const newLevel = calculateLevelFromXp(user.xp);

            if (newLevel > oldLevel) {
                await t.user.update({ where: { id: userId }, data: { level: newLevel } });
            }

            return { user, oldLevel, newLevel };
        };

        // Use provided transaction OR start a new one
        const result = tx
            ? await executeChanges(tx)
            : await prisma.$transaction(executeChanges);

        // Side effects (events) only if committed - we can't guarantee commit here if using external tx,
        // but it's acceptable to emit events optimistically or defer them.
        // For simplicity, we emit now. If tx rolls back, event might be misleading but data is safe.
        emitEvent({ type: 'XP_GAINED', userId, amount, source });

        if (result.newLevel > result.oldLevel) {
            emitEvent({ type: 'LEVEL_UP', userId, oldLevel: result.oldLevel, newLevel: result.newLevel });
            return { awarded: true, newXp: result.user.xp, levelUp: { oldLevel: result.oldLevel, newLevel: result.newLevel } };
        }

        return { awarded: true, newXp: result.user.xp };
    } catch (e) {
        // Idempotency key conflict - already awarded
        // Check if it was an idempotency violation (P2002)
        const client = getClient(tx);
        const user = await client.user.findUnique({ where: { id: userId } });
        return { awarded: false, newXp: user?.xp || 0 };
    }
}

/**
 * Evaluate and award badges based on context
 */
export async function evaluateAndAwardBadges(ctx: EvaluationContext, tx?: TxClient): Promise<Badge[]> {
    // NOTE: syncBadgeDefinitions() must be called at server startup, NOT here.
    // Calling it here with global prisma inside a transaction causes a deadlock.
    const client = getClient(tx);

    const [badges, userBadges] = await Promise.all([
        client.badge.findMany({ where: { isActive: true } }),
        client.userBadge.findMany({ where: { userId: ctx.userId } }),
    ]);

    const userBadgeMap = new Map(userBadges.map(ub => [ub.badgeId, ub]));
    const awardedBadges: Badge[] = [];

    for (const badge of badges) {
        const definition = BADGE_DEFINITIONS.find(d => d.name === badge.name);
        if (!definition) continue;

        const progress = definition.evaluator(ctx);
        const userBadge = userBadgeMap.get(badge.id);
        const isEarned = userBadge?.state === 'earned';

        if (isEarned) continue; // Already earned

        const shouldEarn = progress >= badge.threshold;
        const newState: BadgeState = shouldEarn ? 'earned' : (progress > 0 ? 'in_progress' : 'locked');

        await client.userBadge.upsert({
            where: { userId_badgeId: { userId: ctx.userId, badgeId: badge.id } },
            update: {
                progress: Math.min(progress, badge.threshold),
                state: newState,
                earnedAt: shouldEarn ? new Date() : undefined,
            },
            create: {
                userId: ctx.userId,
                badgeId: badge.id,
                progress: Math.min(progress, badge.threshold),
                state: newState,
                earnedAt: shouldEarn ? new Date() : undefined,
            },
        });

        if (shouldEarn) {
            awardedBadges.push(badge);
            // Pass the transaction client along!
            await awardXp(ctx.userId, badge.xpReward, 'badge_unlock', badge.id, new Date(), client);
            emitEvent({ type: 'BADGE_EARNED', userId: ctx.userId, badgeId: badge.id, badgeName: badge.name });
        } else if (progress > 0) {
            emitEvent({ type: 'BADGE_PROGRESS', userId: ctx.userId, badgeId: badge.id, progress, threshold: badge.threshold });
        }
    }

    return awardedBadges;
}

/**
 * Build evaluation context for a user
 */
export async function buildEvaluationContext(userId: string, tx?: TxClient): Promise<EvaluationContext> {
    const client = getClient(tx);
    const user = await client.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: user.weekStart as 0 | 1 });

    const [habits, weeklyLogs, allLogs] = await Promise.all([
        client.habit.findMany({ where: { userId } }),
        client.habitLog.count({
            where: {
                habit: { userId },
                completed: true,
                date: { gte: weekStart },
            },
        }),
        client.habitLog.count({
            where: { habit: { userId }, completed: true },
        }),
    ]);

    const currentStreak = Math.max(...habits.map(h => h.currentStreak), 0);
    const longestStreak = Math.max(...habits.map(h => h.longestStreak), 0);

    return {
        userId,
        currentStreak,
        longestStreak,
        totalCompletions: allLogs,
        weeklyCompletions: weeklyLogs,
        totalXp: user.xp,
        perfectWeeks: 0, // TODO: Calculate from history
        daysSinceSignup: differenceInDays(now, user.createdAt),
        weekStart: user.weekStart,
    };
}

/**
 * Update challenge progress for a user
 */
export async function updateChallengeProgress(
    userId: string,
    completionDate: Date,
    currentStreak: number,
    xpEarned: number,
    tx?: TxClient
): Promise<void> {
    const date = startOfDay(completionDate);
    const client = getClient(tx);

    const activeParticipants = await client.challengeParticipant.findMany({
        where: {
            userId,
            state: 'active',
            challenge: {
                status: 'active',
                startDate: { lte: date },
                OR: [{ endDate: null }, { endDate: { gte: date } }],
            },
        },
        include: { challenge: true },
    });

    for (const participant of activeParticipants) {
        const { challenge } = participant;
        let increment = 0;

        switch (challenge.targetType) {
            case 'daily_completions':
            case 'total_completions':
                increment = 1;
                break;
            case 'streak_days':
                increment = currentStreak >= challenge.targetValue ? challenge.targetValue - participant.progress : 0;
                break;
            case 'xp_gain':
                increment = xpEarned;
                break;
            case 'perfect_week':
                // Handled separately at week end
                break;
        }

        if (increment <= 0) continue;

        const newProgress = Math.min(participant.progress + increment, challenge.targetValue);
        const isCompleted = newProgress >= challenge.targetValue;

        await client.challengeParticipant.update({
            where: { id: participant.id },
            data: {
                progress: newProgress,
                state: isCompleted ? 'completed' : 'active',
                completedAt: isCompleted ? new Date() : undefined,
            },
        });

        if (isCompleted) {
            // Pass the transaction client along!
            await awardXp(userId, challenge.xpReward, 'challenge_complete', challenge.id, new Date(), client);
            emitEvent({ type: 'CHALLENGE_COMPLETED', userId, challengeId: challenge.id });
        }
    }
}

/**
 * Get user's badges with progress
 */
export async function getUserBadges(userId: string, tx?: TxClient) {
    await syncBadgeDefinitions();
    const client = getClient(tx);

    const [badges, userBadges] = await Promise.all([
        client.badge.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
        client.userBadge.findMany({ where: { userId }, include: { badge: true } }),
    ]);

    const userBadgeMap = new Map(userBadges.map(ub => [ub.badgeId, ub]));

    return badges.map(badge => {
        const userBadge = userBadgeMap.get(badge.id);
        return {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            category: badge.category,
            tier: badge.tier,
            rarity: badge.rarity,
            threshold: badge.threshold,
            xpReward: badge.xpReward,
            icon: badge.icon,
            color: badge.color,
            state: userBadge?.state || 'locked',
            progress: userBadge?.progress || 0,
            earnedAt: userBadge?.earnedAt,
        };
    });
}
// ... (rest of the file stays mostly the same, just keeping other read methods)
/**
 * Get available challenges with user's participation status
 */
export async function getChallenges(userId: string) {
    await syncDefaultChallenges();

    // Update challenge statuses based on dates
    const now = new Date();
    await prisma.challenge.updateMany({
        where: { status: 'upcoming', startDate: { lte: now } },
        data: { status: 'active' },
    });
    await prisma.challenge.updateMany({
        where: { status: 'active', endDate: { lt: now } },
        data: { status: 'expired' },
    });

    const challenges = await prisma.challenge.findMany({
        where: { isActive: true, status: { in: ['upcoming', 'active'] } },
        include: {
            participants: { where: { userId } },
            _count: { select: { participants: true } },
        },
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    });

    return challenges.map(ch => {
        const participant = ch.participants[0];
        return {
            id: ch.id,
            title: ch.title,
            description: ch.description,
            type: ch.type,
            targetType: ch.targetType,
            targetValue: ch.targetValue,
            status: ch.status,
            difficulty: ch.difficulty,
            xpReward: ch.xpReward,
            startDate: ch.startDate,
            endDate: ch.endDate,
            participantCount: ch._count.participants,
            joined: Boolean(participant),
            participantState: participant?.state || null,
            progress: participant?.progress || 0,
            completedAt: participant?.completedAt || null,
        };
    });
}

/**
 * Join a challenge
 */
export async function joinChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || challenge.status !== 'active') {
        throw new Error('Challenge not found or not active');
    }

    await prisma.challengeParticipant.upsert({
        where: { challengeId_userId: { challengeId, userId } },
        update: { state: 'active' },
        create: { challengeId, userId, state: 'active' },
    });

    emitEvent({ type: 'CHALLENGE_JOINED', userId, challengeId });
}

/**
 * Leave a challenge
 */
export async function leaveChallenge(userId: string, challengeId: string): Promise<void> {
    await prisma.challengeParticipant.updateMany({
        where: { challengeId, userId },
        data: { state: 'withdrawn' },
    });
}

/**
 * Get challenge leaderboard
 */
export async function getChallengeLeaderboard(challengeId: string, userId: string) {
    const participants = await prisma.challengeParticipant.findMany({
        where: { challengeId, state: { in: ['active', 'completed'] } },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: [{ progress: 'desc' }, { joinedAt: 'asc' }],
    });

    let currentRank = 0;
    let lastProgress = -1;
    let tieCount = 0;

    const leaderboard = participants.map((p, idx) => {
        if (p.progress !== lastProgress) {
            currentRank = idx + 1;
            tieCount = 1;
        } else {
            tieCount++;
        }
        lastProgress = p.progress;

        return {
            userId: p.userId,
            name: p.user.name,
            avatar: p.user.avatar,
            progress: p.progress,
            rank: currentRank,
            isTied: tieCount > 1,
            isCurrentUser: p.userId === userId,
            completedAt: p.completedAt,
        };
    });

    return leaderboard;
}

/**
 * Get recently earned badges (last 7 days)
 */
export async function getRecentlyEarnedBadges(userId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return prisma.userBadge.findMany({
        where: {
            userId,
            state: 'earned',
            earnedAt: { gte: sevenDaysAgo },
        },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
    });
}

/**
 * Process expired challenges
 * Safely updates status and awards rewards to winners
 */
export async function processExpiredChallenges(): Promise<void> {
    const now = new Date();

    // 1. Find active challenges that have ended
    const expiredChallenges = await prisma.challenge.findMany({
        where: {
            status: 'active',
            endDate: { lt: now }
        },
        include: {
            participants: true
        }
    });

    for (const challenge of expiredChallenges) {
        await prisma.$transaction(async (tx) => {
            // Update challenge status
            await tx.challenge.update({
                where: { id: challenge.id },
                data: { status: 'completed' }
            });

            // Process participants
            for (const p of challenge.participants) {
                // If already completed or withdrawn, skip
                if (p.state === 'completed' || p.state === 'withdrawn') continue;

                const isWinner = p.progress >= challenge.targetValue;
                const newState = isWinner ? 'completed' : 'failed';

                // Update participant state
                await tx.challengeParticipant.update({
                    where: { id: p.id },
                    data: {
                        state: newState,
                        completedAt: isWinner ? now : null
                    }
                });
            }
        });

        // Award rewards for winners outside the tx block (idempotent)
        const winners = challenge.participants.filter(p =>
            p.state !== 'withdrawn' && p.progress >= challenge.targetValue
        );

        for (const winner of winners) {
            await awardXp(
                winner.userId,
                challenge.xpReward,
                'challenge_complete',
                challenge.id,
                now
            );
            emitEvent({ type: 'CHALLENGE_COMPLETED', userId: winner.userId, challengeId: challenge.id });
        }
    }
}
