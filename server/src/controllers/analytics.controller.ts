import { Response } from 'express';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format, eachDayOfInterval } from 'date-fns';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

// ============================================
// DASHBOARD SUMMARY
// ============================================
export const getSummary = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const today = new Date();
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);

        // Get user with habits
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: {
                habits: {
                    where: { status: 'active' },
                    include: {
                        logs: {
                            where: { date: { gte: weekStart, lte: weekEnd } }
                        }
                    }
                }
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const totalHabits = user.habits.length;
        const totalStreaks = user.habits.reduce((acc, h) => acc + h.currentStreak, 0);
        const bestStreak = Math.max(0, ...user.habits.map(h => h.longestStreak));

        // Weekly completion rate
        const weeklyLogs = user.habits.flatMap(h => h.logs.filter(l => l.completed));
        const weekDays = 7;
        const expectedCompletions = totalHabits * weekDays;
        const actualCompletions = weeklyLogs.length;
        const weeklyCompletionRate = expectedCompletions > 0
            ? Math.round((actualCompletions / expectedCompletions) * 100)
            : 0;

        res.json({
            user: {
                name: user.name,
                xp: user.xp,
                level: user.level
            },
            stats: {
                totalHabits,
                totalStreaks,
                bestStreak,
                weeklyCompletionRate
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch summary" });
    }
};

// ============================================
// HEATMAP DATA (Full Year)
// ============================================
export const getHeatmap = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const today = new Date();
        const yearAgo = subDays(today, 365);

        const logs = await prisma.habitLog.findMany({
            where: {
                habit: { userId: req.user.userId },
                date: { gte: yearAgo, lte: today },
                completed: true
            },
            select: { date: true }
        });

        // Aggregate by date
        const map: Record<string, number> = {};
        logs.forEach(log => {
            const dateStr = format(log.date, 'yyyy-MM-dd');
            map[dateStr] = (map[dateStr] || 0) + 1;
        });

        // Convert to array
        const data = Object.entries(map).map(([date, count]) => ({ date, count }));

        res.json(data);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch heatmap" });
    }
};

// ============================================
// WEEKLY/MONTHLY COMPLETION STATS
// ============================================
export const getCompletionStats = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { period = 'week' } = req.query;

    try {
        const today = new Date();
        const start = period === 'month' ? startOfMonth(today) : startOfWeek(today);
        const end = period === 'month' ? endOfMonth(today) : endOfWeek(today);

        const habits = await prisma.habit.findMany({
            where: { userId: req.user.userId, status: 'active' },
            include: {
                logs: {
                    where: { date: { gte: start, lte: end } }
                }
            }
        });

        // Calculate per-habit stats
        const habitStats = habits.map(habit => {
            const days = eachDayOfInterval({ start, end });
            const completions = habit.logs.filter(l => l.completed).length;
            const expected = days.length;
            const rate = expected > 0 ? Math.round((completions / expected) * 100) : 0;

            return {
                id: habit.id,
                title: habit.title,
                color: habit.color,
                icon: habit.icon,
                completions,
                expected,
                rate,
                streak: habit.currentStreak
            };
        });

        // Sort by rate
        habitStats.sort((a, b) => b.rate - a.rate);

        const totalCompletions = habitStats.reduce((acc, h) => acc + h.completions, 0);
        const totalExpected = habitStats.reduce((acc, h) => acc + h.expected, 0);
        const overallRate = totalExpected > 0 ? Math.round((totalCompletions / totalExpected) * 100) : 0;

        res.json({
            period,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            overallRate,
            totalCompletions,
            totalExpected,
            habits: habitStats
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch completion stats" });
    }
};

// ============================================
// STREAK TRENDS (Last 30 days)
// ============================================
export const getStreakTrends = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const habits = await prisma.habit.findMany({
            where: { userId: req.user.userId, status: 'active' },
            select: {
                id: true,
                title: true,
                color: true,
                currentStreak: true,
                longestStreak: true
            },
            orderBy: { currentStreak: 'desc' }
        });

        res.json({
            habits,
            total: habits.reduce((acc, h) => acc + h.currentStreak, 0),
            average: habits.length > 0
                ? Math.round(habits.reduce((acc, h) => acc + h.currentStreak, 0) / habits.length)
                : 0
        });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch streak trends" });
    }
};

// ============================================
// XP PROGRESSION TIMELINE
// ============================================
export const getXpProgression = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const logs = await prisma.habitLog.findMany({
            where: {
                habit: { userId: req.user.userId },
                xpEarned: { gt: 0 }
            },
            select: { date: true, xpEarned: true },
            orderBy: { date: 'asc' }
        });

        // Aggregate by date
        const daily: Record<string, number> = {};
        logs.forEach(log => {
            const dateStr = format(log.date, 'yyyy-MM-dd');
            daily[dateStr] = (daily[dateStr] || 0) + log.xpEarned;
        });

        // Calculate cumulative
        let cumulative = 0;
        const timeline = Object.entries(daily).map(([date, xp]) => {
            cumulative += xp;
            return { date, daily: xp, total: cumulative };
        });

        res.json(timeline);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch XP progression" });
    }
};
