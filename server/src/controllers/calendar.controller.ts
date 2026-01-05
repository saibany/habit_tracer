import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

const eventSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    color: z.string().optional(),
    startDate: z.string(), // ISO date string
    endDate: z.string().optional(),
    allDay: z.boolean().default(false),
    linkedType: z.enum(['habit', 'task']).optional(),
    linkedId: z.string().optional(),
});

export const getEvents = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to } = req.query;

    try {
        const events = await prisma.calendarEvent.findMany({
            where: {
                userId: req.user.userId,
                ...(from && to && {
                    startDate: {
                        gte: new Date(from as string),
                        lte: new Date(to as string)
                    }
                })
            },
            orderBy: { startDate: 'asc' }
        });
        res.json(events);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch events" });
    }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const data = eventSchema.parse(req.body);
        const event = await prisma.calendarEvent.create({
            data: {
                ...data,
                userId: req.user.userId,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null
            }
        });
        res.status(201).json(event);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        const data = eventSchema.partial().parse(req.body);
        const event = await prisma.calendarEvent.update({
            where: { id, userId: req.user.userId },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined
            }
        });
        res.json(event);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { id } = req.params;

    try {
        await prisma.calendarEvent.delete({ where: { id, userId: req.user.userId } });
        res.json({ message: 'Event deleted' });
    } catch (e) {
        res.status(500).json({ error: "Failed to delete event" });
    }
};
