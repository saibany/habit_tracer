/**
 * CSRF Protection Middleware
 * For cookie-based authentication, we use SameSite cookies and verify origin
 */

import { Request, Response, NextFunction } from 'express';
import { getEnv } from '../utils/env';

/**
 * Verify request origin matches allowed origins
 * With SameSite=Lax cookies, we can be more lenient
 */
export const verifyOrigin = (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = getEnv('CLIENT_URL').split(',').map(url => url.trim());

    // Allow requests without origin header if they have a valid cookie
    // SameSite=Lax cookies provide CSRF protection for these requests
    if (!origin) {
        const hasCookie = req.cookies?.token || req.cookies?.refreshToken;
        if (hasCookie) {
            return next();
        }
        // For auth endpoints (login/register), allow without cookies
        if (req.path.includes('/auth/')) {
            return next();
        }
    }

    // Verify origin matches allowed origins
    if (origin) {
        try {
            const originUrl = new URL(origin);
            const isAllowed = allowedOrigins.some(allowed => {
                try {
                    const allowedUrl = new URL(allowed);
                    return originUrl.origin === allowedUrl.origin;
                } catch {
                    return allowed.includes(originUrl.host);
                }
            });

            if (isAllowed) {
                return next();
            }
        } catch {
            // Invalid origin URL, reject
        }
    }

    // Log rejection for debugging
    console.warn('[CSRF] Rejected request:', {
        method: req.method,
        path: req.path,
        origin: origin || 'none',
        allowedOrigins
    });

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
