import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getRequiredEnv } from '../utils/env';

export interface AuthRequest extends Request {
    user?: { userId: string };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const JWT_SECRET = getRequiredEnv('JWT_SECRET');
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded as { userId: string };
        next();
    } catch (err) {
        // Don't leak information about why token is invalid
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
