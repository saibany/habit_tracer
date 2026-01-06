/**
 * Account lockout protection against brute force attacks
 */

import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { getClientIp } from './security';

interface FailedAttempt {
    count: number;
    lastAttempt: Date;
    lockedUntil?: Date;
}

/**
 * Clear all lockouts (for testing/admin purposes)
 */
export function clearAllLockouts(): void {
    failedAttempts.clear();
    console.log('All account lockouts cleared');
}

// In-memory store for failed login attempts
// In production, consider using Redis for distributed systems
const failedAttempts = new Map<string, FailedAttempt>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Clean up every hour

// Cleanup old entries periodically
setInterval(() => {
    const now = new Date();
    for (const [key, attempt] of failedAttempts.entries()) {
        if (attempt.lockedUntil && attempt.lockedUntil < now) {
            failedAttempts.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS);

/**
 * Check if account is locked due to too many failed attempts
 */
export async function checkAccountLockout(
    email: string,
    ipAddress: string
): Promise<{ locked: boolean; remainingTime?: number }> {
    const key = `${email}:${ipAddress}`;
    const attempt = failedAttempts.get(key);

    if (!attempt) {
        return { locked: false };
    }

    // Check if still locked
    if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
        const remainingTime = Math.ceil(
            (attempt.lockedUntil.getTime() - Date.now()) / 1000 / 60
        );
        return { locked: true, remainingTime };
    }

    // Lockout expired, reset
    if (attempt.lockedUntil && attempt.lockedUntil <= new Date()) {
        failedAttempts.delete(key);
        return { locked: false };
    }

    return { locked: false };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string, ipAddress: string): void {
    const key = `${email}:${ipAddress}`;
    const existing = failedAttempts.get(key);

    if (existing) {
        existing.count += 1;
        existing.lastAttempt = new Date();

        // Lock account after max attempts
        if (existing.count >= MAX_FAILED_ATTEMPTS) {
            existing.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        }
    } else {
        failedAttempts.set(key, {
            count: 1,
            lastAttempt: new Date()
        });
    }
}

/**
 * Clear failed attempts on successful login
 */
export function clearFailedAttempts(email: string, ipAddress: string): void {
    const key = `${email}:${ipAddress}`;
    failedAttempts.delete(key);
}

/**
 * Middleware to check account lockout before login
 */
export const checkLockout = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const { email } = req.body;
    const ipAddress = getClientIp(req);

    if (!email) {
        return next();
    }

    const lockoutStatus = await checkAccountLockout(email, ipAddress);

    if (lockoutStatus.locked) {
        return res.status(429).json({
            error: 'Account temporarily locked due to too many failed login attempts',
            remainingTime: lockoutStatus.remainingTime
        });
    }

    next();
};
