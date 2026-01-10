-- Cleanup unverified users from the database
-- Run this in Railway's Postgres console or using: npx prisma db execute --file scripts/cleanup.sql

-- First, delete related records (to avoid foreign key violations)
DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "AuditLog" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "UserSettings" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "UserBadge" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "ChallengeParticipant" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "Habit" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "Task" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);
DELETE FROM "CalendarEvent" WHERE "userId" IN (SELECT id FROM "User" WHERE "emailVerified" = false);

-- Finally, delete the unverified users
DELETE FROM "User" WHERE "emailVerified" = false;

-- Verify cleanup
SELECT COUNT(*) as remaining_unverified FROM "User" WHERE "emailVerified" = false;
