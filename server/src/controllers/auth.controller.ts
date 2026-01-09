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

        // Generate verification token
        const { generateToken, sendVerificationEmail } = await import('../lib/email');
        const { token, hash } = generateToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with verification token
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                emailVerified: false,
                emailVerificationToken: hash,
                emailTokenExpiry: tokenExpiry,
                settings: {
                    create: {}
                }
            }
        });

        // Send verification email
        await sendVerificationEmail(email, token);

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'user_register',
            ipAddress: getClientIp(req)
        });

        res.status(201).json({
            success: true,
            message: 'Account created! Please check your email to verify your account.',
            requiresVerification: true
        });
    } catch (e: unknown) {
        console.error('[Auth] Register error:', e);
        if (e instanceof z.ZodError) {
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
        console.error('[Auth] Registration error details:', e);
        res.status(500).json({
            error: 'Registration failed',
            message: (e as Error).message || 'An unexpected error occurred',
            details: (e as Error).stack
        });
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

        // Check email verification
        if (!user.emailVerified) {
            return res.status(403).json({
                error: 'Email not verified',
                message: 'Please verify your email address before logging in.',
                code: 'EMAIL_NOT_VERIFIED'
            });
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
            // Delete session from database
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

        // Clear cookies with matching options
        const isProduction = getEnv('NODE_ENV') === 'production';
        const clearOptions = {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax' as const,
            path: '/'
        };

        res.clearCookie('token', clearOptions);
        res.clearCookie('refreshToken', clearOptions);

        res.json({ message: 'Logged out successfully' });
    } catch (e) {
        console.error('[Auth] Logout error:', e);
        // Still clear cookies even on error
        res.clearCookie('token');
        res.clearCookie('refreshToken');
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

        // Set cookie with consistent options
        const isProduction = getEnv('NODE_ENV') === 'production';
        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: '/'
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

    // Limit sessions per user (max 5) - cleanup oldest if exceeded
    const MAX_SESSIONS_PER_USER = 5;
    const existingCount = await prisma.session.count({ where: { userId } });
    if (existingCount >= MAX_SESSIONS_PER_USER) {
        const oldestSessions = await prisma.session.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            take: existingCount - MAX_SESSIONS_PER_USER + 1,
            select: { id: true }
        });
        if (oldestSessions.length > 0) {
            await prisma.session.deleteMany({
                where: { id: { in: oldestSessions.map(s => s.id) } }
            });
        }
    }

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

    // Cookie options for secure, cross-device compatible auth
    const cookieOptions = {
        httpOnly: true,           // Prevents JavaScript access (XSS protection)
        secure: isProduction,     // HTTPS only in production
        sameSite: 'lax' as const, // Lax allows cookies on top-level navigations, protects CSRF
        path: '/'                 // Available on all routes
    };

    // Access token - short-lived (15 minutes)
    res.cookie('token', accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Refresh token - long-lived (7 days)
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

function sanitizeUser(user: { id: string; email: string; name: string; avatar: string | null; xp: number; level: number }) {
    // Sanitize user data before sending to client
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level
    };
}

// ============================================
// VERIFY EMAIL (GET for email links)
// ============================================
export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        // Hash the token to compare with stored hash
        const { hashToken } = await import('../lib/email');
        const hashedToken = hashToken(token);

        // Find user with matching token
        const user = await prisma.user.findFirst({
            where: { emailVerificationToken: hashedToken }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid verification token',
                message: 'This verification link is invalid or has already been used.'
            });
        }

        // Check if token is expired
        if (user.emailTokenExpiry && user.emailTokenExpiry < new Date()) {
            return res.status(400).json({
                error: 'Verification link expired',
                message: 'This verification link has expired. Please request a new one.',
                code: 'TOKEN_EXPIRED'
            });
        }

        // Mark email as verified and clear token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerificationToken: null,
                emailTokenExpiry: null
            }
        });

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'email_verified',
            ipAddress: getClientIp(req)
        });

        res.json({
            success: true,
            message: 'Email verified successfully! You can now log in.'
        });
    } catch (e) {
        console.error('[Auth] Verify email error:', e);
        res.status(500).json({ error: 'Verification failed', message: 'An error occurred. Please try again.' });
    }
};

// ============================================
// RESEND VERIFICATION EMAIL
// ============================================
// Rate limit tracking (in-memory, simple)
const resendAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RESEND_RATE_LIMIT = 3; // Max 3 resends per 15 minutes
const RESEND_WINDOW = 15 * 60 * 1000; // 15 minutes

export const resendVerification = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Rate limiting
        const now = Date.now();
        const attempts = resendAttempts.get(normalizedEmail);
        if (attempts) {
            if (now - attempts.lastAttempt < RESEND_WINDOW) {
                if (attempts.count >= RESEND_RATE_LIMIT) {
                    return res.status(429).json({
                        error: 'Too many requests',
                        message: 'Please wait before requesting another verification email.',
                        retryAfter: Math.ceil((RESEND_WINDOW - (now - attempts.lastAttempt)) / 1000)
                    });
                }
                attempts.count++;
                attempts.lastAttempt = now;
            } else {
                resendAttempts.set(normalizedEmail, { count: 1, lastAttempt: now });
            }
        } else {
            resendAttempts.set(normalizedEmail, { count: 1, lastAttempt: now });
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

        // Always return success to prevent email enumeration
        if (!user || user.emailVerified) {
            return res.json({
                success: true,
                message: 'If an unverified account exists, a verification email has been sent.'
            });
        }

        // Generate new token
        const { generateToken, sendVerificationEmail } = await import('../lib/email');
        const { token, hash } = generateToken();
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user with new token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerificationToken: hash,
                emailTokenExpiry: tokenExpiry
            }
        });

        // Send email
        await sendVerificationEmail(normalizedEmail, token);

        res.json({
            success: true,
            message: 'A new verification email has been sent.'
        });
    } catch (e) {
        console.error('[Auth] Resend verification error:', e);
        res.status(500).json({ error: 'Failed to resend verification email' });
    }
};
