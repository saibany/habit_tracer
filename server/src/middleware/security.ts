/**
 * Security middleware utilities
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Add request ID for tracing
 */
export const requestId = (req: Request & { id?: string }, res: Response, next: NextFunction): void => {
    req.id = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .trim()
        .slice(0, 10000); // Max length
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };
    
    for (const key in sanitized) {
        if (typeof sanitized[key] === 'string') {
            sanitized[key] = sanitizeInput(sanitized[key]) as any;
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeObject(sanitized[key]);
        }
    }
    
    return sanitized;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Get client IP address (respects proxy headers)
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
