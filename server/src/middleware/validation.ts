/**
 * Request validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { isValidUUID } from './security';

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
            } else {
                res.status(400).json({ error: 'Invalid request' });
            }
        }
    };
}

/**
 * Validate request query parameters
 */
export function validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    error: 'Invalid query parameters',
                    details: error.errors.map(e => ({
                        path: e.path.join('.'),
                        message: e.message
                    }))
                });
            } else {
                res.status(400).json({ error: 'Invalid query parameters' });
            }
        }
    };
}

/**
 * Validate UUID parameter
 */
export function validateUUID(paramName: string = 'id') {
    return (req: Request, res: Response, next: NextFunction): void => {
        const id = req.params[paramName];
        if (!id || !isValidUUID(id)) {
            return res.status(400).json({ error: `Invalid ${paramName} format` });
        }
        next();
    };
}

/**
 * Common query parameter schemas
 */
export const commonQuerySchemas = {
    pagination: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().max(100)).optional(),
    }),
    status: z.object({
        status: z.enum(['active', 'paused', 'archived', 'pending', 'completed', 'cancelled']).optional(),
    }),
    dateRange: z.object({
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
    })
};
