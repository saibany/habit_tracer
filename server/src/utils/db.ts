import prisma from './prisma';

export const checkDatabaseConnection = async (): Promise<boolean> => {
    // Log database URL info (masked) for debugging
    const dbUrl = process.env.DATABASE_URL || '';
    try {
        const url = new URL(dbUrl);
        console.log(`📡 Connecting to database: ${url.host} (port: ${url.port})`);
    } catch {
        console.error('❌ Invalid DATABASE_URL format');
    }

    try {
        // Simple query to verify connection with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout (5s)')), 5000)
        );
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            timeoutPromise
        ]);
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        console.error('   Hint: Check that DATABASE_URL has correct host, port (6543 for Supabase pooler), and password');
        return false;
    }
};

export const gracefulShutdown = async (): Promise<void> => {
    console.log('Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
};

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
