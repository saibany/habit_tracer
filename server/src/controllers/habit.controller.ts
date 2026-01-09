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
// LOG HABIT COMPLETION - WITH RETRY LOGIC
// ============================================
export const logHabit = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const { date, value = 1, notes } = req.body;

    const sanitizedNotes = notes ? sanitizeInput(notes) : undefined;
    if (!date) return res.status(400).json({ error: "Date is required" });

    const dateObj = startOfDay(new Date(date));
    const userId = req.user.userId;

    console.log(`[Habits] logHabit START: habitId=${id}, userId=${userId}, date=${date}`);
    const startTime = Date.now();

    try {
        // Import retry helper
        const { withRetry } = await import('../utils/prisma');

        // STEP 1: Get habit (with retry)
        const habit = await withRetry(
            () => prisma.habit.findUnique({
                where: { id, userId },
                include: { logs: { orderBy: { date: 'desc' }, take: 30 } }
            }),
            'findHabit'
        );

        if (!habit) {
            console.log(`[Habits] Habit not found: ${id}`);
            return res.status(404).json({ error: "Habit not found" });
        }

        console.log(`[Habits] Habit found in ${Date.now() - startTime}ms`);

        // STEP 2: Check if already logged (idempotency)
        const existingLog = habit.logs.find(l => isSameDay(l.date, dateObj));
        if (existingLog?.completed) {
            console.log(`[Habits] Already logged today, returning cached`);
            return res.json({
                log: existingLog,
                streak: { current: habit.currentStreak, longest: habit.longestStreak },
                xpEarned: 0,
                newTotalXp: 0,
                newBadges: []
            });
        }

        // STEP 3: Calculate XP
        const xpBase = Math.min(10 + habit.currentStreak * 2, 50);

        // STEP 4: Upsert log (with retry)
        const log = await withRetry(
            () => prisma.habitLog.upsert({
                where: { habitId_date: { habitId: id, date: dateObj } },
                update: { value, completed: true, notes: sanitizedNotes, xpEarned: xpBase },
                create: { habitId: id, date: dateObj, value, completed: true, notes: sanitizedNotes, xpEarned: xpBase }
            }),
            'upsertLog'
        );

        console.log(`[Habits] Log upserted in ${Date.now() - startTime}ms`);

        // STEP 5: Calculate streak locally (no additional queries)
        const allLogs = [log, ...habit.logs.filter(l => !isSameDay(l.date, dateObj))];
        const { currentStreak, longestStreak } = calculateStreak(allLogs, dateObj);

        // STEP 6: Update habit streak (with retry)
        await withRetry(
            () => prisma.habit.update({
                where: { id },
                data: { currentStreak, longestStreak, lastCompletedAt: dateObj }
            }),
            'updateStreak'
        );

        console.log(`[Habits] Streak updated in ${Date.now() - startTime}ms`);

        // STEP 7: Award XP directly (with retry)
        let newTotalXp = 0;
        try {
            const user = await withRetry(
                () => prisma.user.update({
                    where: { id: userId },
                    data: { xp: { increment: xpBase } }
                }),
                'awardXp'
            );
            newTotalXp = user.xp;
            console.log(`[Habits] XP awarded in ${Date.now() - startTime}ms`);
        } catch (xpErr) {
            console.error('[Habits] XP award failed (non-fatal):', xpErr);
            const user = await prisma.user.findUnique({ where: { id: userId } });
            newTotalXp = user?.xp || 0;
        }

        const totalTime = Date.now() - startTime;
        console.log(`[Habits] logHabit COMPLETE in ${totalTime}ms`);

        // Return response immediately
        res.json({
            log,
            streak: { current: currentStreak, longest: longestStreak },
            xpEarned: xpBase,
            newTotalXp,
            newBadges: []
        });

    } catch (e: unknown) {
        const totalTime = Date.now() - startTime;
        console.error(`[Habits] logHabit FAILED after ${totalTime}ms:`, e);
        res.status(500).json({ error: "Failed to log habit. Please try again." });
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
