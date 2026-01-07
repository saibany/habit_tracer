-- Enhanced Gamification Migration
-- Handles existing data properly

-- DropIndex
DROP INDEX IF EXISTS "Badge_type_threshold_idx";
DROP INDEX IF EXISTS "Challenge_targetType_idx";

-- First, add new columns with defaults to Badge
ALTER TABLE "Badge" 
ADD COLUMN IF NOT EXISTS "category" TEXT,
ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#6366F1',
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "rarity" TEXT NOT NULL DEFAULT 'common',
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS "xpReward" INTEGER NOT NULL DEFAULT 25;

-- Migrate type to category (streak -> streak, completions -> volume, xp -> volume)
UPDATE "Badge" SET "category" = CASE 
  WHEN "type" = 'streak' THEN 'streak'
  WHEN "type" = 'completions' THEN 'volume'
  WHEN "type" = 'xp' THEN 'volume'
  ELSE 'volume'
END WHERE "category" IS NULL;

-- Now make category NOT NULL
ALTER TABLE "Badge" ALTER COLUMN "category" SET NOT NULL;

-- Fix nullable description - set default for NULL values
UPDATE "Badge" SET "description" = name || ' badge' WHERE "description" IS NULL;
ALTER TABLE "Badge" ALTER COLUMN "description" SET NOT NULL;

-- Fix nullable icon - set default for NULL values  
UPDATE "Badge" SET "icon" = '🏅' WHERE "icon" IS NULL;
ALTER TABLE "Badge" ALTER COLUMN "icon" SET NOT NULL;

-- Drop old type column
ALTER TABLE "Badge" DROP COLUMN IF EXISTS "type";

-- AlterTable Challenge
ALTER TABLE "Challenge" 
ADD COLUMN IF NOT EXISTS "badgeReward" TEXT,
ADD COLUMN IF NOT EXISTS "difficulty" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'global',
ADD COLUMN IF NOT EXISTS "xpReward" INTEGER NOT NULL DEFAULT 50;

-- Update challenge status based on dates
UPDATE "Challenge" SET "status" = 
  CASE 
    WHEN "startDate" > NOW() THEN 'upcoming'
    WHEN "endDate" IS NOT NULL AND "endDate" < NOW() THEN 'completed'
    ELSE 'active'
  END;

-- AlterTable ChallengeParticipant - add updatedAt with default
ALTER TABLE "ChallengeParticipant" 
ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable UserBadge - add state and updatedAt
ALTER TABLE "UserBadge" 
ADD COLUMN IF NOT EXISTS "notifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "state" TEXT NOT NULL DEFAULT 'locked',
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update UserBadge state based on earnedAt
UPDATE "UserBadge" SET "state" = 'earned' WHERE "earnedAt" IS NOT NULL;
UPDATE "UserBadge" SET "state" = 'in_progress' WHERE "earnedAt" IS NULL AND "progress" > 0;

-- CreateTable XpTransaction
CREATE TABLE IF NOT EXISTS "XpTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex XpTransaction
CREATE UNIQUE INDEX IF NOT EXISTS "XpTransaction_idempotencyKey_key" ON "XpTransaction"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "XpTransaction_userId_idx" ON "XpTransaction"("userId");
CREATE INDEX IF NOT EXISTS "XpTransaction_userId_source_idx" ON "XpTransaction"("userId", "source");
CREATE INDEX IF NOT EXISTS "XpTransaction_createdAt_idx" ON "XpTransaction"("createdAt");

-- CreateIndex Badge
CREATE INDEX IF NOT EXISTS "Badge_category_idx" ON "Badge"("category");
CREATE INDEX IF NOT EXISTS "Badge_tier_idx" ON "Badge"("tier");
CREATE INDEX IF NOT EXISTS "Badge_isActive_sortOrder_idx" ON "Badge"("isActive", "sortOrder");

-- CreateIndex Challenge
CREATE INDEX IF NOT EXISTS "Challenge_status_idx" ON "Challenge"("status");
CREATE INDEX IF NOT EXISTS "Challenge_type_idx" ON "Challenge"("type");
CREATE INDEX IF NOT EXISTS "Challenge_isActive_status_idx" ON "Challenge"("isActive", "status");

-- CreateIndex ChallengeParticipant
CREATE INDEX IF NOT EXISTS "ChallengeParticipant_userId_state_idx" ON "ChallengeParticipant"("userId", "state");
CREATE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_progress_idx" ON "ChallengeParticipant"("challengeId", "progress");

-- CreateIndex UserBadge
CREATE INDEX IF NOT EXISTS "UserBadge_userId_state_idx" ON "UserBadge"("userId", "state");
CREATE INDEX IF NOT EXISTS "UserBadge_earnedAt_idx" ON "UserBadge"("earnedAt");
