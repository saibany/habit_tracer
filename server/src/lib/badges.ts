/**
 * @deprecated This file is superseded by gamificationService.ts
 * All badge logic now lives in the centralized gamificationService.
 * This file is kept only for backwards compatibility with any imports.
 */

// Re-export from gamificationService for backwards compatibility
export {
    BADGE_DEFINITIONS,
    evaluateAndAwardBadges as evaluateBadges,
    syncBadgeDefinitions as ensureBadgesExist,
    getUserBadges,
} from './gamificationService';

