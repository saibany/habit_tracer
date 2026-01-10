/**
 * Cleanup script to delete unverified user accounts
 * Run with: npx ts-node scripts/cleanup-unverified.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupUnverifiedUsers() {
    console.log('🧹 Starting cleanup of unverified users...\n');

    // Find unverified users
    const unverifiedUsers = await prisma.user.findMany({
        where: { emailVerified: false },
        select: { id: true, email: true, name: true, createdAt: true }
    });

    if (unverifiedUsers.length === 0) {
        console.log('✅ No unverified users found. Database is clean!');
        return;
    }

    console.log(`Found ${unverifiedUsers.length} unverified user(s):`);
    unverifiedUsers.forEach((user, i) => {
        console.log(`  ${i + 1}. ${user.email} (${user.name}) - Created: ${user.createdAt.toISOString()}`);
    });

    // Delete related data first (sessions, audit logs, etc.)
    for (const user of unverifiedUsers) {
        console.log(`\n🗑️  Deleting user: ${user.email}`);

        // Delete sessions
        const deletedSessions = await prisma.session.deleteMany({
            where: { userId: user.id }
        });
        console.log(`   - Deleted ${deletedSessions.count} session(s)`);

        // Delete audit logs
        const deletedLogs = await prisma.auditLog.deleteMany({
            where: { userId: user.id }
        });
        console.log(`   - Deleted ${deletedLogs.count} audit log(s)`);

        // Delete settings
        const deletedSettings = await prisma.userSettings.deleteMany({
            where: { userId: user.id }
        });
        console.log(`   - Deleted ${deletedSettings.count} setting(s)`);

        // Delete the user
        await prisma.user.delete({
            where: { id: user.id }
        });
        console.log(`   ✅ User deleted`);
    }

    console.log(`\n🎉 Cleanup complete! Deleted ${unverifiedUsers.length} unverified user(s).`);
}

cleanupUnverifiedUsers()
    .catch((e) => {
        console.error('❌ Cleanup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
