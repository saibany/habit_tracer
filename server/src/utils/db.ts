import prisma from './prisma';

export const checkDatabaseConnection = async (): Promise<boolean> => {
    try {
        // Simple query to verify connection with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Database connection timeout')), 5000)
        );
        await Promise.race([
            prisma.$queryRaw`SELECT 1`,
            timeoutPromise
        ]);
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
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
