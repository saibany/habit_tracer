import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../lib/auditLog';

const settingsSchema = z.object({
    timezone: z.string().max(50).optional(),
    weekStart: z.number().min(0).max(6).optional(),
    notificationsEnabled: z.boolean().optional(),
    emailReminders: z.boolean().optional(),
    darkMode: z.boolean().optional(),
});

// ============================================
// GET SETTINGS
// ============================================
export const getSettings = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: { settings: true }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                xp: user.xp,
                level: user.level,
                timezone: user.timezone,
                weekStart: user.weekStart,
                createdAt: user.createdAt
            },
            settings: user.settings || {
                notificationsEnabled: true,
                emailReminders: false,
                darkMode: false
            }
        });
    } catch (e) {
        console.error('[Settings] Error fetching settings:', e);
        res.status(500).json({ error: "Failed to fetch settings" });
    }
};

// ============================================
// UPDATE SETTINGS
// ============================================
export const updateSettings = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const data = settingsSchema.parse(req.body);

        // Update user fields
        if (data.timezone !== undefined || data.weekStart !== undefined) {
            await prisma.user.update({
                where: { id: req.user.userId },
                data: {
                    timezone: data.timezone,
                    weekStart: data.weekStart
                }
            });
        }

        // Upsert settings
        const settings = await prisma.userSettings.upsert({
            where: { userId: req.user.userId },
            update: {
                notificationsEnabled: data.notificationsEnabled,
                emailReminders: data.emailReminders,
                darkMode: data.darkMode
            },
            create: {
                userId: req.user.userId,
                notificationsEnabled: data.notificationsEnabled ?? true,
                emailReminders: data.emailReminders ?? false,
                darkMode: data.darkMode ?? false
            }
        });

        res.json(settings);
    } catch (e: unknown) {
        console.error('[Settings] Error updating settings:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: 'Validation failed', details: e.errors });
        }
        res.status(400).json({ error: 'Failed to update settings' });
    }
};

// ============================================
// EXPORT DATA
// ============================================
export const exportData = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            include: {
                habits: { include: { logs: true } },
                tasks: true,
                events: true,
                settings: true
            }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        await createAuditLog({
            userId: req.user.userId,
            action: 'data_export',
            ipAddress: req.ip
        });

        // Remove sensitive data
        const exportData = {
            exportedAt: new Date().toISOString(),
            user: {
                name: user.name,
                email: user.email,
                xp: user.xp,
                level: user.level,
                createdAt: user.createdAt
            },
            habits: user.habits.map(h => ({
                title: h.title,
                description: h.description,
                color: h.color,
                icon: h.icon,
                frequency: h.frequency,
                currentStreak: h.currentStreak,
                longestStreak: h.longestStreak,
                createdAt: h.createdAt,
                logs: h.logs.map(l => ({
                    date: l.date,
                    completed: l.completed,
                    xpEarned: l.xpEarned
                }))
            })),
            tasks: user.tasks.map(t => ({
                title: t.title,
                description: t.description,
                priority: t.priority,
                status: t.status,
                dueDate: t.dueDate,
                completedAt: t.completedAt,
                xpEarned: t.xpEarned,
                createdAt: t.createdAt
            })),
            events: user.events,
            settings: user.settings
        };

        res.setHeader('Content-Disposition', 'attachment; filename=habit-tracker-export.json');
        res.json(exportData);
    } catch (e) {
        console.error('[Settings] Error exporting data:', e);
        res.status(500).json({ error: "Failed to export data" });
    }
};

// ============================================
// DELETE ACCOUNT
// ============================================
export const deleteAccount = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid password' });

        await createAuditLog({
            userId: req.user.userId,
            action: 'account_delete',
            ipAddress: req.ip
        });

        // Cascade delete handles all related data
        await prisma.user.delete({ where: { id: req.user.userId } });

        res.clearCookie('token');
        res.clearCookie('refreshToken');
        res.json({ message: 'Account deleted successfully' });
    } catch (e) {
        console.error('[Settings] Error deleting account:', e);
        res.status(500).json({ error: "Failed to delete account" });
    }
};
