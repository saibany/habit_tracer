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

// Serve static files from client
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));

    app.get('*', (_req, res) => {
        res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });
}

// Health Check
app.get('/health', async (_req, res) => {
    const dbConnected = await checkDatabaseConnection();
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'ok' : 'degraded',
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

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
    // Startup
    (async () => {
        // Check database connection on startup
        const dbConnected = await checkDatabaseConnection();
        if (!dbConnected) {
            console.error('❌ Could not connect to database. Check your DATABASE_URL in .env');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`\n✅ Server running on http://localhost:${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   API:    http://localhost:${PORT}/api/v1\n`);
        });
    })();
}

export default app;
