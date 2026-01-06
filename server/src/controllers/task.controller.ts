import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../lib/auditLog';
import { sanitizeInput } from '../middleware/security';

const taskSchema = z.object({
    title: z.string().min(1).max(200).transform(val => sanitizeInput(val)),
    description: z.string().max(1000).transform(val => sanitizeInput(val)).optional(),
    notes: z.string().max(2000).transform(val => sanitizeInput(val)).optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    status: z.enum(['pending', 'completed', 'cancelled']).default('pending'),
    dueDate: z.string().optional(),
    dueTime: z.string().max(5).optional(),
    estimatedMins: z.number().min(1).max(480).optional(),
    categoryId: z.string().uuid().optional(),
});

// ============================================
// GET ALL TASKS
// ============================================
export const getTasks = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { status, from, to } = req.query;

    try {
        const tasks = await prisma.task.findMany({
            where: {
                userId: req.user.userId,
                ...(status && { status: status as string }),
                ...(from && to && {
                    dueDate: {
                        gte: new Date(from as string),
                        lte: new Date(to as string)
                    }
                })
            },
            include: { category: true },
            orderBy: [
                { dueDate: 'asc' },
                { priority: 'desc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(tasks);
    } catch (e) {
        console.error('[Tasks] Error fetching tasks:', e);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
};

// ============================================
// GET SINGLE TASK
// ============================================
export const getTask = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const task = await prisma.task.findUnique({
            where: { id },
            include: { category: true }
        });

        if (!task || task.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json(task);
    } catch (e) {
        console.error('[Tasks] Error fetching task:', e);
        res.status(500).json({ error: "Failed to fetch task" });
    }
};

// ============================================
// CREATE TASK
// ============================================
export const createTask = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const data = taskSchema.parse(req.body);
        const task = await prisma.task.create({
            data: {
                ...data,
                userId: req.user.userId,
                dueDate: data.dueDate ? new Date(data.dueDate) : null
            },
            include: { category: true }
        });

        await createAuditLog({
            userId: req.user.userId,
            action: 'task_create',
            entity: 'task',
            entityId: task.id,
            metadata: { title: task.title }
        });

        res.status(201).json(task);
    } catch (e: unknown) {
        console.error('[Tasks] Error creating task:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: e.errors });
        }
        res.status(400).json({ error: 'Failed to create task' });
    }
};

// ============================================
// UPDATE TASK
// ============================================
export const updateTask = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Task not found' });
        }

        const data = taskSchema.partial().parse(req.body);
        const task = await prisma.task.update({
            where: { id },
            data: {
                ...data,
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined
            },
            include: { category: true }
        });
        res.json(task);
    } catch (e: unknown) {
        console.error('[Tasks] Error updating task:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: e.errors });
        }
        res.status(400).json({ error: 'Failed to update task' });
    }
};

// ============================================
// DELETE TASK
// ============================================
export const deleteTask = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await prisma.task.delete({ where: { id } });
        res.json({ message: 'Task deleted' });
    } catch (e) {
        console.error('[Tasks] Error deleting task:', e);
        res.status(500).json({ error: "Failed to delete task" });
    }
};

// ============================================
// COMPLETE TASK (TRANSACTIONAL)
// ============================================
export const completeTask = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const task = await tx.task.findUnique({ where: { id } });

            if (!task || task.userId !== userId) {
                throw new Error('Task not found');
            }

            // Idempotency check
            if (task.status === 'completed') {
                return { task, xpEarned: 0, alreadyCompleted: true };
            }

            const xpEarned = 15;

            // Update task
            const updatedTask = await tx.task.update({
                where: { id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                    xpEarned
                }
            });

            // Update user XP
            const user = await tx.user.update({
                where: { id: userId },
                data: { xp: { increment: xpEarned } }
            });

            // Check for level up
            const newLevel = Math.floor(user.xp / 100) + 1;
            if (newLevel > user.level) {
                await tx.user.update({
                    where: { id: userId },
                    data: { level: newLevel }
                });
            }

            return { task: updatedTask, xpEarned, newLevel: newLevel > user.level ? newLevel : undefined };
        });

        if (!result.alreadyCompleted) {
            await createAuditLog({
                userId,
                action: 'task_complete',
                entity: 'task',
                entityId: id,
                metadata: { xpEarned: result.xpEarned }
            });
        }

        res.json(result);
    } catch (e: unknown) {
        console.error('[Tasks] Error completing task:', e);
        if (e instanceof Error && e.message === 'Task not found') {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(500).json({ error: "Failed to complete task" });
    }
};
