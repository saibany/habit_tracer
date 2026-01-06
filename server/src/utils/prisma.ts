import { PrismaClient } from '@prisma/client';

// Prisma Client with connection pooling and query optimization
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
});

// Connection pool configuration
// Prisma automatically manages connection pooling, but we can configure it
// through the DATABASE_URL connection string parameters:
// Example: postgresql://user:password@host:port/database?connection_limit=10&pool_timeout=20

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
