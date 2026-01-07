import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../utils/prisma';
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from 'date-fns';
import { calculateXpForLevel, calculateLevelFromXp } from '../lib/gamificationService';

// ============================================
// XP ECONOMY RULES - Documented and exposed via API
// ============================================
export const XP_ECONOMY = {
    // Habit completion XP
    habitBase: 10,
    streakBonusPerDay: 2,
    streakBonusCap: 40,
    perfectDayBonus: 25,

    // Badge XP by tier
    badgeXp: {
        bronze: { min: 10, max: 25 },
        silver: { min: 50, max: 75 },
        gold: { min: 100, max: 150 },
        platinum: { min: 200, max: 500 },
    },

    // Challenge XP by difficulty
    challengeXp: {
        easy: 100,
        medium: 150,
        hard: 250,
        extreme: 400,
    },

    // Streak milestones
    streakMilestones: [
        { days: 7, bonus: 50 },
        { days: 30, bonus: 200 },
        { days: 100, bonus: 500 },
        { days: 365, bonus: 2000 },
    ],

    // Level curve
    levelFormula: "XP = 50 × level^1.5",
};

// ============================================
// XP BREAKDOWN - Today, Week, Month, By Source
// ============================================
export const getXpBreakdown = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.userId;

    try {
        const now = new Date();
        const todayStart = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
        const monthStart = startOfMonth(now);

        // Get user's current XP and level
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { xp: true, level: true, createdAt: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Fetch XP transactions for today, week, and month
        const [todayTransactions, weekTransactions, monthTransactions, allBySource, totalTransactions] = await Promise.all([
            prisma.xpTransaction.findMany({
                where: { userId, createdAt: { gte: todayStart } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.xpTransaction.findMany({
                where: { userId, createdAt: { gte: weekStart } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.xpTransaction.findMany({
                where: { userId, createdAt: { gte: monthStart } },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.xpTransaction.groupBy({
                by: ['source'],
                where: { userId },
                _sum: { amount: true },
                _count: true
            }),
            prisma.xpTransaction.count({ where: { userId } })
        ]);

        // Calculate totals
        const xpToday = todayTransactions.reduce((acc, t) => acc + t.amount, 0);
        const xpThisWeek = weekTransactions.reduce((acc, t) => acc + t.amount, 0);
        const xpThisMonth = monthTransactions.reduce((acc, t) => acc + t.amount, 0);

        // Build source breakdown with percentage
        const sourceBreakdown = allBySource.map(s => ({
            source: s.source,
            totalXp: s._sum.amount || 0,
            transactionCount: s._count,
            percentage: user.xp > 0 ? Math.round(((s._sum.amount || 0) / user.xp) * 100) : 0
        }));

        // Level progress
        const currentLevel = user.level;
        const xpForCurrentLevel = calculateXpForLevel(currentLevel);
        const xpForNextLevel = calculateXpForLevel(currentLevel + 1);
        const xpInCurrentLevel = user.xp - xpForCurrentLevel;
        const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100);

        // Calculate average XP per day since signup
        const daysSinceSignup = Math.max(1, Math.ceil((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
        const avgXpPerDay = Math.round(user.xp / daysSinceSignup);

        res.json({
            totalXp: user.xp,
            level: currentLevel,
            xpToday,
            xpThisWeek,
            xpThisMonth,
            avgXpPerDay,
            totalTransactions,
            sourceBreakdown,
            levelProgress: {
                currentLevel,
                xpForCurrentLevel,
                xpForNextLevel,
                xpInCurrentLevel,
                xpNeededForNextLevel,
                progressPercent: Math.max(0, Math.min(100, progressPercent))
            },
            economy: XP_ECONOMY
        });
    } catch (e) {
        console.error('[XP] Error getting breakdown:', e);
        res.status(500).json({ error: 'Failed to fetch XP breakdown' });
    }
};

// ============================================
// XP HISTORY - Timeline of transactions
// ============================================
export const getXpHistory = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    try {
        const [transactions, total] = await Promise.all([
            prisma.xpTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.xpTransaction.count({ where: { userId } })
        ]);

        // Batch fetch all related entities to avoid N+1 queries
        const habitIds = transactions
            .filter(t => t.source === 'habit_complete' && t.sourceId)
            .map(t => t.sourceId as string);
        const badgeIds = transactions
            .filter(t => t.source === 'badge_unlock' && t.sourceId)
            .map(t => t.sourceId as string);
        const challengeIds = transactions
            .filter(t => t.source === 'challenge_complete' && t.sourceId)
            .map(t => t.sourceId as string);

        const [habits, badges, challenges] = await Promise.all([
            habitIds.length > 0
                ? prisma.habit.findMany({ where: { id: { in: habitIds } }, select: { id: true, title: true } })
                : [],
            badgeIds.length > 0
                ? prisma.badge.findMany({ where: { id: { in: badgeIds } }, select: { id: true, name: true, icon: true } })
                : [],
            challengeIds.length > 0
                ? prisma.challenge.findMany({ where: { id: { in: challengeIds } }, select: { id: true, title: true } })
                : [],
        ]);

        // Create lookup maps for O(1) access
        const habitMap = new Map(habits.map(h => [h.id, h]));
        const badgeMap = new Map(badges.map(b => [b.id, b]));
        const challengeMap = new Map(challenges.map(c => [c.id, c]));

        // Enrich transactions with source details (no additional queries)
        const enrichedTransactions = transactions.map((t) => {
            let sourceName = '';
            let sourceIcon = '⚡';

            switch (t.source) {
                case 'habit_complete':
                    if (t.sourceId) {
                        const habit = habitMap.get(t.sourceId);
                        sourceName = habit?.title || 'Habit completed';
                    } else {
                        sourceName = 'Habit completed';
                    }
                    sourceIcon = '✅';
                    break;
                case 'badge_unlock':
                    if (t.sourceId) {
                        const badge = badgeMap.get(t.sourceId);
                        sourceName = badge?.name || 'Badge unlocked';
                        sourceIcon = badge?.icon || '🏅';
                    } else {
                        sourceName = 'Badge unlocked';
                        sourceIcon = '🏅';
                    }
                    break;
                case 'challenge_complete':
                    if (t.sourceId) {
                        const challenge = challengeMap.get(t.sourceId);
                        sourceName = challenge?.title || 'Challenge completed';
                    } else {
                        sourceName = 'Challenge completed';
                    }
                    sourceIcon = '🏆';
                    break;
                case 'streak_bonus':
                    sourceName = 'Streak bonus';
                    sourceIcon = '🔥';
                    break;
                case 'perfect_week':
                    sourceName = 'Perfect week';
                    sourceIcon = '🎯';
                    break;
                default:
                    sourceName = t.source;
            }

            return {
                id: t.id,
                amount: t.amount,
                source: t.source,
                sourceId: t.sourceId,
                sourceName,
                sourceIcon,
                createdAt: t.createdAt
            };
        });

        res.json({
            transactions: enrichedTransactions,
            total,
            limit,
            offset,
            hasMore: offset + transactions.length < total
        });
    } catch (e) {
        console.error('[XP] Error getting history:', e);
        res.status(500).json({ error: 'Failed to fetch XP history' });
    }
};

// ============================================
// LEVEL INFO - Detailed level calculation
// ============================================
export const getLevelInfo = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.userId;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { xp: true, level: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Generate level curve preview (next 10 levels)
        const levelCurve = [];
        for (let i = 1; i <= Math.max(10, user.level + 5); i++) {
            levelCurve.push({
                level: i,
                xpRequired: calculateXpForLevel(i),
                xpForNext: calculateXpForLevel(i + 1) - calculateXpForLevel(i)
            });
        }

        const currentLevel = calculateLevelFromXp(user.xp);
        const xpForCurrentLevel = calculateXpForLevel(currentLevel);
        const xpForNextLevel = calculateXpForLevel(currentLevel + 1);

        res.json({
            totalXp: user.xp,
            currentLevel,
            xpForCurrentLevel,
            xpForNextLevel,
            xpToNextLevel: xpForNextLevel - user.xp,
            progressPercent: Math.round(((user.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100),
            levelCurve
        });
    } catch (e) {
        console.error('[XP] Error getting level info:', e);
        res.status(500).json({ error: 'Failed to fetch level info' });
    }
};
