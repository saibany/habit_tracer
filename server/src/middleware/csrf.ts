/**
 * CSRF Protection Middleware
 * For cookie-based authentication, we use SameSite cookies and verify origin
 */

import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../utils/env';

/**
 * Verify request origin matches allowed origins
 */
export const verifyOrigin = (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF check for same-origin requests and GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = getEnv('CLIENT_URL').split(',').map(url => url.trim());

    // Allow requests without origin (same-origin, mobile apps, etc.)
    if (!origin) {
        // Check if it's a same-origin request by verifying host
        const host = req.headers.host;
        if (host && allowedOrigins.some(allowed => allowed.includes(host))) {
            return next();
        }
    }

    // Verify origin matches allowed origins
    if (origin) {
        const originUrl = new URL(origin);
        const isAllowed = allowedOrigins.some(allowed => {
            try {
                const allowedUrl = new URL(allowed);
                return originUrl.origin === allowedUrl.origin;
            } catch {
                return allowed.includes(originUrl.origin);
            }
        });

        if (isAllowed) {
            return next();
        }
    }

    // Reject request if origin doesn't match
    res.status(403).json({ error: 'Invalid origin' });
};

/**
 * Verify X-Requested-With header (additional CSRF protection)
 */
export const verifyRequestedWith = (req: Request, res: Response, next: NextFunction): void => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Check for X-Requested-With header (set by axios)
    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith === 'XMLHttpRequest') {
        return next();
    }

    // Allow if Content-Type is not application/json (form submissions, etc.)
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
        return next();
    }

    // For JSON API requests, require X-Requested-With
    res.status(403).json({ error: 'Missing required header' });
};
