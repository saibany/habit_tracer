import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../lib/auditLog';

const registerSchema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(6).max(100),
    name: z.string().min(1).max(100)
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-this';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '1h') as any;
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

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
            ipAddress: req.ip
        });

        // DO NOT auto-login - user must manually login
        res.status(201).json({
            success: true,
            message: 'Account created successfully! Please log in.'
        });
    } catch (e: unknown) {
        console.error('[Auth] Register error:', e);
        if (e instanceof z.ZodError) {
            return res.status(400).json({ error: 'Invalid input', details: e.errors });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
};

// ============================================
// LOGIN
// ============================================
export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Create tokens
        const { accessToken, refreshToken } = await createTokens(user.id, req);

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'user_login',
            ipAddress: req.ip
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
            return res.status(400).json({ error: 'Invalid input' });
        }
        res.status(500).json({ error: 'Login failed' });
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
                ipAddress: req.ip
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
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
            expiresAt
        }
    });

    return { accessToken, refreshToken, session };
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
}

function sanitizeUser(user: { id: string; email: string; name: string; avatar: string | null; xp: number; level: number }) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level
    };
}
