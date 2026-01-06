/**
 * Rate limiting configuration
 * Different limits for different endpoint types
 */

import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import { Request } from 'express';
import { getEnv } from '../utils/env';

/**
 * General API rate limiter
 */
export const apiLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: parseInt(getEnv('RATE_LIMIT_WINDOW_MS'), 10),
    max: parseInt(getEnv('RATE_LIMIT_MAX'), 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path === '/health';
    },
    keyGenerator: (req: Request) => {
        // Use IP address for rate limiting
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return (req.ip || req.socket.remoteAddress || 'unknown') as string;
    }
});

/**
 * Stricter rate limiter for authentication endpoints
 */
export const authLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(getEnv('RATE_LIMIT_AUTH_MAX'), 10), // 5 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later.' },
    skipSuccessfulRequests: true, // Don't count successful requests
    keyGenerator: (req: Request) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return (req.ip || req.socket.remoteAddress || 'unknown') as string;
    }
});

/**
 * Rate limiter for password reset and sensitive operations
 */
export const sensitiveLimiter: RateLimitRequestHandler = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later.' },
    keyGenerator: (req: Request) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return (req.ip || req.socket.remoteAddress || 'unknown') as string;
    }
});
