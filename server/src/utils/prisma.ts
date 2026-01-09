import { PrismaClient } from '@prisma/client';

// Prisma Client with error logging
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});

/**
 * Retry a database operation with exponential backoff
 * Use this for critical operations that might fail due to connection issues
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    baseDelay: number = 500
): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const isConnectionError = error?.code === 'P1001' || error?.code === 'P2024' || error?.code === 'P1008';

            if (!isConnectionError || attempt === maxRetries) {
                throw error;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.warn(`[Prisma] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Warmup the database connection by running a simple query
 * This establishes the connection so subsequent queries are fast
 */
export async function warmupConnection(): Promise<boolean> {
    const maxAttempts = 5;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`[Prisma] Connection warmup attempt ${attempt}/${maxAttempts}...`);
            await prisma.$queryRaw`SELECT 1`;
            console.log(`[Prisma] ✅ Connection warmed up successfully`);
            return true;
        } catch (error: any) {
            console.warn(`[Prisma] Connection warmup failed (attempt ${attempt}):`, error?.message);
            if (attempt < maxAttempts) {
                const delay = baseDelay * attempt;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    console.error('[Prisma] ❌ Could not warmup connection after all attempts');
    return false;
}

/**
 * Keep-alive: ping database every 30 seconds to prevent connection drops
 */
let keepAliveInterval: NodeJS.Timeout | null = null;

export function startKeepAlive(): void {
    if (keepAliveInterval) return;

    keepAliveInterval = setInterval(async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            console.warn('[Prisma] Keep-alive ping failed, connection may be dropped');
        }
    }, 30000); // Every 30 seconds

    console.log('[Prisma] Keep-alive started (30s interval)');
}

export function stopKeepAlive(): void {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

// Graceful shutdown for containers/Railway (handles SIGTERM/SIGINT)
const shutdown = async (signal: string) => {
    console.log(`\n[Prisma] Received ${signal}, disconnecting...`);
    stopKeepAlive();
    await prisma.$disconnect();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('beforeExit', async () => {
    stopKeepAlive();
    await prisma.$disconnect();
});

export default prisma;
