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
// LOG HABIT COMPLETION (OPTIMIZED FOR PGBOUNCER)
// ============================================
export const logHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { date, value = 1, notes } = req.body;

    // Sanitize notes if provided
    const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;

    if (!date) return res.status(400).json({ error: "Date is required" });

    const dateObj = startOfDay(new Date(date));
    const userId = req.user.userId;

    try {
        // STEP 1: Fast core operation - log habit and update streak (no gamification)
        // This must succeed for the habit to be marked complete
        const habit = await prisma.habit.findUnique({
            where: { id, userId },
            include: {
                logs: {
                    orderBy: { date: 'desc' },
                    take: 100
                }
            }
        });

        if (!habit) {
            return res.status(404).json({ error: "Habit not found" });
        }

        // Check if already logged today (idempotency)
        const existingLog = habit.logs.find(l => isSameDay(l.date, dateObj));
        if (existingLog?.completed) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            return res.json({
                log: existingLog,
                streak: { current: habit.currentStreak, longest: habit.longestStreak },
                xpEarned: 0,
                newTotalXp: user?.xp || 0,
                message: 'Already completed today',
                newBadges: []
            });
        }

        // Calculate XP (base 10 + streak bonus, capped)
        const xpBase = Math.min(10 + habit.currentStreak * 2, 50);

        // Upsert log - this is the critical operation
        const log = await prisma.habitLog.upsert({
            where: { habitId_date: { habitId: id, date: dateObj } },
            update: { value, completed: true, notes: sanitizedNotes, xpEarned: xpBase },
            create: { habitId: id, date: dateObj, value, completed: true, notes: sanitizedNotes, xpEarned: xpBase }
        });

        // Calculate new streak
        const allLogs = [log, ...habit.logs.filter(l => !isSameDay(l.date, dateObj))];
        const { currentStreak, longestStreak } = calculateStreak(allLogs, dateObj);

        // Update habit streak
        await prisma.habit.update({
            where: { id },
            data: {
                currentStreak,
                longestStreak,
                lastCompletedAt: dateObj
            }
        });

        // STEP 2: Gamification updates - these can fail without rolling back the habit log
        // We wrap each in try-catch to ensure partial failures don't break the response
        let xpResult: { awarded: boolean; newXp: number; levelUp?: any } = { awarded: false, newXp: 0, levelUp: undefined };
        let newBadges: any[] = [];

        try {
            // Award XP - no transaction, idempotent
            xpResult = await awardXp(userId, xpBase, 'habit_complete', id, dateObj);
        } catch (xpError) {
            console.error('[Habits] XP award failed (non-fatal):', xpError);
        }

        try {
            // Update challenge progress - no transaction
            await updateChallengeProgress(userId, dateObj, currentStreak, xpBase);
        } catch (challengeError) {
            console.error('[Habits] Challenge update failed (non-fatal):', challengeError);
        }

        try {
            // Evaluate badges - no transaction
            const ctx = await buildEvaluationContext(userId);
            newBadges = await evaluateAndAwardBadges(ctx);
        } catch (badgeError) {
            console.error('[Habits] Badge evaluation failed (non-fatal):', badgeError);
        }

        // Audit log (non-critical)
        createAuditLog({
            userId,
            action: 'habit_complete',
            entity: 'habit',
            entityId: id,
            metadata: { xpEarned: xpBase, streak: currentStreak }
        }).catch(err => console.error('[Habits] Audit log failed:', err));

        // Get final XP from database if award failed
        let finalXp = xpResult.newXp;
        if (!xpResult.awarded) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            finalXp = user?.xp || 0;
        }

        res.json({
            log,
            streak: { current: currentStreak, longest: longestStreak },
            xpEarned: xpBase,
            newLevel: xpResult.levelUp?.newLevel,
            levelUp: xpResult.levelUp,
            newBadges,
            newTotalXp: finalXp
        });
    } catch (e: unknown) {
        console.error('[Habits] Error logging habit:', e);
        if (e instanceof Error && e.message === "Habit not found") {
            return res.status(404).json({ error: "Habit not found" });
        }
        res.status(500).json({ error: "Failed to log habit" });
    }
};

// ============================================
// UNDO HABIT LOG (TRANSACTIONAL)
// ============================================
export const undoLog = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { date } = req.body;

    if (!date) return res.status(400).json({ error: "Date is required" });

    const dateObj = startOfDay(new Date(date));
    const userId = req.user.userId;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Find the log
            const log = await tx.habitLog.findUnique({
                where: { habitId_date: { habitId: id, date: dateObj } }
            });

            if (!log) throw new Error("Log not found");

            // 2. Remove XP if earned
            if (log.xpEarned > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: { xp: { decrement: log.xpEarned } }
                });
            }

            // 3. Delete log
            await tx.habitLog.delete({
                where: { habitId_date: { habitId: id, date: dateObj } }
            });

            // 4. Recalculate streak
            const habit = await tx.habit.findUnique({
                where: { id },
                include: { logs: { orderBy: { date: 'desc' }, take: 100 } }
            });

            if (habit) {
                const { currentStreak, longestStreak } = calculateStreak(habit.logs, new Date());
                await tx.habit.update({
                    where: { id },
                    data: { currentStreak, longestStreak }
                });
            }

            return { xpRemoved: log.xpEarned };
        });

        await createAuditLog({
            userId,
            action: 'habit_undo',
            entity: 'habit',
            entityId: id,
            metadata: { xpRemoved: result.xpRemoved }
        });

        res.json({ message: 'Log undone', ...result });
    } catch (e: unknown) {
        console.error('[Habits] Error undoing log:', e);
        if (e instanceof Error && e.message === "Log not found") {
            return res.status(404).json({ error: "Log not found" });
        }
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
