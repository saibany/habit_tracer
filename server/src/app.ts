import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables first
dotenv.config();

// Validate environment variables
import { validateEnv } from './utils/env';
validateEnv();

// Routes
import authRoutes from './routes/auth.routes';
import habitRoutes from './routes/habit.routes';
import taskRoutes from './routes/task.routes';
import calendarRoutes from './routes/calendar.routes';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import challengeRoutes from './routes/challenge.routes';
import badgeRoutes from './routes/badge.routes';
import xpRoutes from './routes/xp.routes';

// Utils
import { checkDatabaseConnection } from './utils/db';
import { getEnv, getRequiredEnv } from './utils/env';

// Security middleware
import { requestId, getClientIp } from './middleware/security';
import { apiLimiter } from './middleware/rateLimit';
import { verifyOrigin, verifyRequestedWith } from './middleware/csrf';

const app = express();
const PORT = parseInt(getEnv('PORT'), 10);

// Trust proxy for accurate IP addresses (important for rate limiting)
if (getEnv('TRUST_PROXY') === 'true') {
    app.set('trust proxy', 1);
}

// Security Headers with Helmet
const isProduction = getEnv('NODE_ENV') === 'production';
app.use(helmet({
    contentSecurityPolicy: isProduction ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    } : false, // Disable in dev for easier development
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// CORS Configuration
const clientUrl = getEnv('CLIENT_URL');
app.use(cors({
    origin: clientUrl.split(','), // Support multiple origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID']
}));

// Body parsing with size limits
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Request ID for tracing
app.use(requestId);

// CSRF Protection
app.use(verifyOrigin);
app.use(verifyRequestedWith);

// Rate Limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/habits', habitRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/challenges', challengeRoutes);
app.use('/api/v1/badges', badgeRoutes);
app.use('/api/v1/xp', xpRoutes);

// Health Check - MUST return 200 immediately for Railway, no database check
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Serve static files from client (AFTER /health route)
if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '../../client/dist');
    console.log(`📂 Static files path: ${clientDistPath}`);

    // Check if path exists
    const fs = require('fs');
    if (fs.existsSync(clientDistPath)) {
        console.log('✅ Client dist folder found');
        app.use(express.static(clientDistPath));

        // Catch-all for SPA routing - MUST be last
        app.get('*', (_req, res) => {
            res.sendFile(path.join(clientDistPath, 'index.html'));
        });
    } else {
        console.error('❌ Client dist folder NOT found at:', clientDistPath);
        app.get('*', (_req, res) => {
            res.status(500).send('Client build not found. Check deployment.');
        });
    }
}

// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = (req as any).id || 'unknown';
    console.error(`[${requestId}] Unhandled Error:`, err);

    // Don't leak error details in production
    const isDevelopment = getEnv('NODE_ENV') !== 'production';

    res.status(500).json({
        error: 'Internal Server Error',
        ...(isDevelopment && { message: err.message, stack: err.stack }),
        requestId
    });
});

if (require.main === module) {
    // START SERVER FIRST - so healthcheck can respond immediately
    app.listen(PORT, () => {
        console.log(`\n✅ Server running on http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/health`);
        console.log(`   API:    http://localhost:${PORT}/api/v1\n`);
    });

    // Initialize database connection and keep it warm
    (async () => {
        // Import warmup functions
        const { warmupConnection, startKeepAlive } = await import('./utils/prisma');

        // Warmup database connection (retries up to 5 times)
        const dbReady = await warmupConnection();
        if (dbReady) {
            // Start keep-alive pings to prevent connection drops
            startKeepAlive();
        } else {
            console.error('❌ Database connection failed. Server may have issues.');
        }

        // Sync gamification data (badges, challenges) - non-critical
        try {
            const { syncBadgeDefinitions, syncDefaultChallenges } = await import('./lib/gamificationService');
            await syncBadgeDefinitions();
            await syncDefaultChallenges();
            console.log('✅ Gamification data synced');
        } catch (e) {
            console.warn('⚠️ Gamification sync failed:', e);
        }
    })();
}

export default app;
