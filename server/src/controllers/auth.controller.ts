import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../lib/auditLog';
import { getRequiredEnv, getEnv } from '../utils/env';
import { getClientIp } from '../middleware/security';
import { checkAccountLockout, recordFailedAttempt, clearFailedAttempts } from '../middleware/accountLockout';

// Enhanced password validation: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const registerSchema = z.object({
    email: z.string().email().max(255).toLowerCase().trim(),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(100)
        .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    name: z.string().min(1).max(100).trim()
});

const loginSchema = z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string()
});

const JWT_SECRET = getRequiredEnv('JWT_SECRET');
const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN') as any;
const REFRESH_EXPIRES_IN = getEnv('REFRESH_TOKEN_EXPIRES_IN');

// ============================================
// REGISTER
// ============================================
export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

        // Check existing user
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user with default settings
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                settings: {
                    create: {}
                }
            }
        });

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'user_register',
            ipAddress: getClientIp(req)
        });

        // DO NOT auto-login - user must manually login
        res.status(201).json({
            success: true,
            message: 'Account created successfully! Please log in.'
        });
    } catch (e: unknown) {
        console.error('[Auth] Register error:', e);
        if (e instanceof z.ZodError) {
            // Extract password-specific errors for better user feedback
            const passwordErrors = e.errors.filter(err => err.path.includes('password'));
            if (passwordErrors.length > 0) {
                const messages = passwordErrors.map(err => err.message);
                return res.status(400).json({ 
                    error: 'Password validation failed',
                    message: messages.join('. '),
                    details: e.errors
                });
            }
            return res.status(400).json({ 
                error: 'Validation failed', 
                message: e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('. '),
                details: e.errors 
            });
        }
        console.error('[Auth] Registration error details:', e);
        res.status(500).json({ error: 'Registration failed', message: 'Please try again or contact support if the problem persists' });
    }
};

// ============================================
// LOGIN
// ============================================
export const login = async (req: Request, res: Response) => {
    const ipAddress = getClientIp(req);
    
    try {
        const { email, password } = loginSchema.parse(req.body);

        // Check account lockout
        const lockoutStatus = await checkAccountLockout(email, ipAddress);
        if (lockoutStatus.locked) {
            return res.status(429).json({
                error: 'Account temporarily locked due to too many failed login attempts',
                remainingTime: lockoutStatus.remainingTime
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Record failed attempt even if user doesn't exist (prevents user enumeration)
            recordFailedAttempt(email, ipAddress);
            // Use generic error message to prevent user enumeration
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            recordFailedAttempt(email, ipAddress);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Clear failed attempts on successful login
        clearFailedAttempts(email, ipAddress);

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(user.id, req);

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'user_login',
            ipAddress
        });

        // Set cookies
        setTokenCookies(res, accessToken, refreshToken);

        res.json({
            user: sanitizeUser(user),
            message: 'Login successful'
        });
    } catch (e: unknown) {
        console.error('[Auth] Login error:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ 
                error: 'Invalid input',
                message: e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('. ')
            });
        }
        console.error('[Auth] Login error details:', e);
        res.status(500).json({ error: 'Login failed', message: 'An error occurred. Please try again.' });
    }
};

// ============================================
// LOGOUT
// ============================================
export const logout = async (req: AuthRequest, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            // Delete session
            await prisma.session.deleteMany({
                where: { refreshToken }
            });
        }

        if (req.user) {
            await createAuditLog({
                userId: req.user.userId,
                action: 'user_logout',
                ipAddress: getClientIp(req)
            });
        }

        // Clear cookies
        res.clearCookie('token');
        res.clearCookie('refreshToken');

        res.json({ message: 'Logged out successfully' });
    } catch (e) {
        console.error('[Auth] Logout error:', e);
        res.json({ message: 'Logged out' });
    }
};

// ============================================
// REFRESH TOKEN
// ============================================
export const refreshAccessToken = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ error: 'No refresh token' });
        }

        // Find and validate session
        const session = await prisma.session.findUnique({
            where: { refreshToken },
            include: { user: true }
        });

        if (!session || session.expiresAt < new Date()) {
            // Clean up expired session
            if (session) {
                await prisma.session.delete({ where: { id: session.id } });
            }
            return res.status(401).json({ error: 'Session expired' });
        }

        // Create new access token
        const accessToken = jwt.sign(
            { userId: session.userId },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });

        res.json({ message: 'Token refreshed' });
    } catch (e) {
        console.error('[Auth] Refresh error:', e);
        res.status(500).json({ error: 'Token refresh failed' });
    }
};

// ============================================
// GET CURRENT USER
// ============================================
export const me = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({ user: sanitizeUser(user) });
    } catch (e) {
        console.error('[Auth] Me error:', e);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
};

// ============================================
// HELPERS
// ============================================

async function createTokens(userId: string, req: Request) {
    const accessToken = jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = require('crypto').randomBytes(64).toString('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create session
    const session = await prisma.session.create({
        data: {
            userId,
            refreshToken,
            userAgent: req.headers['user-agent'] || null,
            ipAddress: getClientIp(req),
            expiresAt
        }
    });

    return { accessToken, refreshToken, session };
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = getEnv('NODE_ENV') === 'production';
    
    res.cookie('token', accessToken, {
        httpOnly: true,
        secure: isProduction, // Only send over HTTPS in production
        sameSite: isProduction ? 'strict' : 'lax', // Stricter in production
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/'
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
    });
}

function sanitizeUser(user: { id: string; email: string; name: string; avatar: string | null; xp: number; level: number }) {
    // Sanitize user data before sending to client
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar, // Avatar URLs should be validated separately
        xp: user.xp,
        level: user.level
    };
}
