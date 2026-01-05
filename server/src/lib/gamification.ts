export const LEVEL_LC_CONSTANT = 0.1; // Level curve constant

export const calculateLevel = (xp: number) => {
    // Simple formula: Level = floor(0.1 * sqrt(XP)) + 1
    // or XP needed = (Level / 0.1)^2
    // Let's use linear scaling for simplicity first or standard RPG curve
    // Level 1: 0-100 XP
    // Level 2: 101-200 XP
    return Math.floor(xp / 100) + 1;
};

export const XP_REWARDS = {
    HABIT_COMPLETE: 10,
    STREAK_BONUS: 5, // Additional per day of streak
    WEEKLY_PERFECT: 50,
};

export const getXpForAction = (action: keyof typeof XP_REWARDS, streak: number = 0) => {
    let xp = XP_REWARDS[action] || 0;
    if (action === 'HABIT_COMPLETE') {
        // Bonus for high streaks (capped at 50 extra)
        xp += Math.min(streak, 10) * 5;
    }
    return xp;
};
