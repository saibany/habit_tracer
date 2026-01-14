import { Response } from 'express';
import { z } from 'zod';
import { startOfDay, subDays, isSameDay, differenceInCalendarDays } from 'date-fns';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../lib/auditLog';
import { evaluateAndAwardBadges, updateChallengeProgress, buildEvaluationContext, awardXp, calculateLevelFromXp } from '../lib/gamificationService';
import { sanitizeInput } from '../middleware/security';

const habitSchema = z.object({
    title: z.string().min(1).max(200).transform(val => sanitizeInput(val)),
    description: z.string().max(1000).transform(val => sanitizeInput(val)).optional(),
    notes: z.string().max(2000).transform(val => sanitizeInput(val)).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(10).transform(val => sanitizeInput(val)).optional(),
    frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
    frequencyDays: z.string().max(20).transform(val => sanitizeInput(val)).optional(),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'anytime']).optional(),
    estimatedMins: z.number().min(1).max(480).optional(),
    goal: z.number().min(1).max(100).default(1),
    unit: z.string().max(50).transform(val => sanitizeInput(val)).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    status: z.enum(['active', 'paused', 'archived']).default('active'),
    categoryId: z.string().uuid().optional(),
});

// ============================================
// GET ALL HABITS
// ============================================
export const getHabits = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status = 'active' } = req.query;

    try {
        const habits = await prisma.habit.findMany({
            where: {
                userId: req.user.userId,
                status: status as string
            },
            include: {
                category: true,
                logs: {
                    where: {
                        date: { gte: subDays(new Date(), 30) }
                    },
                    orderBy: { date: 'desc' }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { createdAt: 'asc' }
            ]
        });
        res.json(habits);
    } catch (e) {
        console.error('[Habits] Error fetching habits:', e);
        res.status(500).json({ error: "Failed to fetch habits" });
    }
};

// ============================================
// GET SINGLE HABIT WITH FULL HISTORY
// ============================================
export const getHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const habit = await prisma.habit.findUnique({
            where: { id, userId: req.user.userId },
            include: {
                category: true,
                logs: {
                    orderBy: { date: 'desc' },
                    take: 365
                }
            }
        });

        if (!habit) return res.status(404).json({ error: 'Habit not found' });
        res.json(habit);
    } catch (e) {
        console.error('[Habits] Error fetching habit:', e);
        res.status(500).json({ error: "Failed to fetch habit" });
    }
};

// ============================================
// CREATE HABIT
// ============================================
export const createHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const data = habitSchema.parse(req.body);
        const habit = await prisma.habit.create({
            data: { ...data, userId: req.user.userId },
            include: { category: true, logs: true }
        });

        await createAuditLog({
            userId: req.user.userId,
            action: 'habit_create',
            entity: 'habit',
            entityId: habit.id,
            metadata: { title: habit.title }
        });

        res.status(201).json(habit);
    } catch (e: unknown) {
        console.error('[Habits] Error creating habit:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: e.errors });
        }
        res.status(400).json({ error: 'Failed to create habit' });
    }
};

// ============================================
// UPDATE HABIT
// ============================================
export const updateHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        // Verify ownership
        const existing = await prisma.habit.findUnique({ where: { id } });
        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        const data = habitSchema.partial().parse(req.body);
        const habit = await prisma.habit.update({
            where: { id },
            data,
            include: { category: true, logs: true }
        });

        await createAuditLog({
            userId: req.user.userId,
            action: 'habit_update',
            entity: 'habit',
            entityId: habit.id
        });

        res.json(habit);
    } catch (e: unknown) {
        console.error('[Habits] Error updating habit:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: e.errors });
        }
        res.status(400).json({ error: 'Failed to update habit' });
    }
};

// ============================================
// DELETE HABIT
// ============================================
export const deleteHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const existing = await prisma.habit.findUnique({ where: { id } });
        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Habit not found' });
        }

        await prisma.habit.delete({ where: { id } });

        await createAuditLog({
            userId: req.user.userId,
            action: 'habit_delete',
            entity: 'habit',
            entityId: id,
            metadata: { title: existing.title }
        });

        res.json({ message: 'Habit deleted' });
    } catch (e) {
        console.error('[Habits] Error deleting habit:', e);
        res.status(500).json({ error: "Failed to delete habit" });
    }
};

// ============================================
// LOG HABIT COMPLETION - FIXED VERSION
// ============================================
export const logHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { date, value = 1, notes } = req.body;

    const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;
    if (!date) return res.status(400).json({ error: "Date is required" });

    // CRITICAL: Normalize to UTC midnight for consistent comparison
    const inputDate = new Date(date);
    const dateObj = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));
    const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD for comparison
    const userId = req.user.userId;

    console.log(`[Habits] logHabit: habitId=${id}, date=${dateKey}`);

    try {
        const { withRetry } = await import('../utils/prisma');

        // STEP 1: Get habit with today's logs
        const habit = await withRetry(
            () => prisma.habit.findUnique({
                where: { id, userId },
                include: { logs: { orderBy: { date: 'desc' }, take: 60 } }
            }),
            'findHabit'
        );

        if (!habit) {
            return res.status(404).json({ error: "Habit not found" });
        }

        // STEP 2: Check if already logged today (use UTC date string comparison)
        const existingLog = habit.logs.find(l => {
            const logDateKey = new Date(l.date).toISOString().split('T')[0];
            return logDateKey === dateKey;
        });

        if (existingLog?.completed) {
            // Already logged - return current state (idempotent)
            const user = await prisma.user.findUnique({ where: { id: userId } });
            return res.json({
                log: existingLog,
                streak: { current: habit.currentStreak, longest: habit.longestStreak },
                xpEarned: 0,
                newTotalXp: Math.max(0, user?.xp || 0),
                newLevel: user?.level || 1,
                isAlreadyLogged: true
            });
        }

        // STEP 3: Calculate XP (capped at 50)
        const xpBase = Math.min(10 + habit.currentStreak * 2, 50);

        // STEP 4: Upsert log atomically
        const log = await withRetry(
            () => prisma.habitLog.upsert({
                where: { habitId_date: { habitId: id, date: dateObj } },
                update: { value, completed: true, notes: sanitizedNotes, xpEarned: xpBase },
                create: { habitId: id, date: dateObj, value, completed: true, notes: sanitizedNotes, xpEarned: xpBase }
            }),
            'upsertLog'
        );

        // STEP 5: Calculate streak with proper UTC comparison
        const allLogs = [log, ...habit.logs.filter(l => {
            const logDateKey = new Date(l.date).toISOString().split('T')[0];
            return logDateKey !== dateKey;
        })];
        const { currentStreak, longestStreak } = calculateStreak(allLogs, dateObj);

        // STEP 6: Update habit streak
        await withRetry(
            () => prisma.habit.update({
                where: { id },
                data: { currentStreak, longestStreak, lastCompletedAt: dateObj }
            }),
            'updateStreak'
        );

        // STEP 7: Award XP and get updated user state
        const user = await withRetry(
            () => prisma.user.update({
                where: { id: userId },
                data: { xp: { increment: xpBase } }
            }),
            'awardXp'
        );

        // Calculate level from XP
        const newLevel = calculateLevelFromXp(user.xp);

        // Update level if changed
        if (newLevel !== user.level) {
            await prisma.user.update({
                where: { id: userId },
                data: { level: newLevel }
            });
        }

        console.log(`[Habits] logHabit COMPLETE: xp=${user.xp}, level=${newLevel}`);

        // Return COMPLETE state for frontend sync
        res.json({
            log,
            streak: { current: currentStreak, longest: longestStreak },
            xpEarned: xpBase,
            newTotalXp: Math.max(0, user.xp),
            newLevel,
            isAlreadyLogged: false
        });

    } catch (e: unknown) {
        console.error(`[Habits] logHabit FAILED:`, e);
        res.status(500).json({ error: "Failed to log habit. Please try again." });
    }
};

// ============================================
// UNDO HABIT LOG - FIXED VERSION
// ============================================
export const undoLog = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { date } = req.body;

    if (!date) return res.status(400).json({ error: "Date is required" });

    // CRITICAL: Normalize to UTC midnight (same as logHabit)
    const inputDate = new Date(date);
    const dateObj = new Date(Date.UTC(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate()));
    const dateKey = dateObj.toISOString().split('T')[0];
    const userId = req.user.userId;

    console.log(`[Habits] undoLog: habitId=${id}, date=${dateKey}`);

    try {
        const { withRetry } = await import('../utils/prisma');

        // 1. Find the log (use proper date)
        const log = await withRetry(
            () => prisma.habitLog.findUnique({
                where: { habitId_date: { habitId: id, date: dateObj } }
            }),
            'findLog'
        );

        if (!log) {
            // Log not found - might already be deleted, return success
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const habit = await prisma.habit.findUnique({ where: { id } });
            return res.json({
                message: 'Log already removed',
                xpRemoved: 0,
                newTotalXp: Math.max(0, user?.xp || 0),
                newLevel: user?.level || calculateLevelFromXp(user?.xp || 0),
                streak: { current: habit?.currentStreak || 0, longest: habit?.longestStreak || 0 }
            });
        }

        // 2. Get current user XP
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });
        const currentXp = Math.max(0, currentUser?.xp || 0);

        // 3. Calculate new XP (NEVER go below 0)
        const xpToRemove = Math.max(0, log.xpEarned || 0);
        const newXp = Math.max(0, currentXp - xpToRemove);

        // 4. Delete the log FIRST (atomic)
        await withRetry(
            () => prisma.habitLog.delete({
                where: { habitId_date: { habitId: id, date: dateObj } }
            }),
            'deleteLog'
        );

        // 5. Update user XP and level
        const newLevel = calculateLevelFromXp(newXp);
        await withRetry(
            () => prisma.user.update({
                where: { id: userId },
                data: { xp: newXp, level: newLevel }
            }),
            'updateXp'
        );

        // 6. Recalculate streak
        const habit = await prisma.habit.findUnique({
            where: { id },
            include: { logs: { orderBy: { date: 'desc' }, take: 100 } }
        });

        let currentStreak = 0;
        let longestStreak = 0;

        if (habit) {
            const streakResult = calculateStreak(habit.logs, new Date());
            currentStreak = streakResult.currentStreak;
            longestStreak = streakResult.longestStreak;

            await prisma.habit.update({
                where: { id },
                data: { currentStreak, longestStreak }
            });
        }

        console.log(`[Habits] undoLog COMPLETE: xp=${newXp}, level=${newLevel}`);

        // Return COMPLETE state for frontend sync
        res.json({
            message: 'Log undone',
            xpRemoved: xpToRemove,
            newTotalXp: newXp,
            newLevel,
            streak: { current: currentStreak, longest: longestStreak }
        });
    } catch (e: unknown) {
        console.error('[Habits] undoLog FAILED:', e);
        res.status(500).json({ error: "Failed to undo log" });
    }
};

// ============================================
// STREAK CALCULATION HELPER
// ============================================
interface LogEntry {
    date: Date;
    completed: boolean;
}

function calculateStreak(logs: LogEntry[], fromDate: Date): { currentStreak: number; longestStreak: number } {
    const completedLogs = logs.filter(l => l.completed).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (completedLogs.length === 0) {
        return { currentStreak: 0, longestStreak: 0 };
    }

    const today = startOfDay(fromDate);

    let currentStreak = 0;
    const lastLogDate = startOfDay(new Date(completedLogs[0].date));

    // Streak is only valid if last log is today or yesterday
    if (differenceInCalendarDays(today, lastLogDate) > 1) {
        currentStreak = 0;
    } else {
        let checkDate = lastLogDate;
        for (const log of completedLogs) {
            const logDate = startOfDay(new Date(log.date));
            if (isSameDay(logDate, checkDate)) {
                currentStreak++;
                checkDate = subDays(checkDate, 1);
            } else if (differenceInCalendarDays(checkDate, logDate) > 1) {
                break;
            }
        }
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const log of completedLogs) {
        const logDate = startOfDay(new Date(log.date));
        if (!prevDate || differenceInCalendarDays(prevDate, logDate) === 1) {
            tempStreak++;
        } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
        }
        prevDate = logDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
}
