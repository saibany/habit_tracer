/**
 * @deprecated This file is superseded by gamificationService.ts
 * All challenge logic now lives in the centralized gamificationService.
 * This file is kept only for backwards compatibility with any imports.
 */

// Re-export from gamificationService for backwards compatibility
export {
    DEFAULT_CHALLENGES,
    syncDefaultChallenges as ensureDefaultChallenges,
    updateChallengeProgress as updateChallengesForCompletion,
    getChallenges,
    joinChallenge,
    leaveChallenge,
    getChallengeLeaderboard,
} from './gamificationService';

