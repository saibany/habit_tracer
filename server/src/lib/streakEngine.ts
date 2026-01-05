import { Habit, HabitLog } from '@prisma/client';
import { differenceInCalendarDays, isSameDay, subDays, startOfDay } from 'date-fns';

/**
 * Calculates the current and longest streak for a habit.
 * This function assumes 'logs' contains ALL logs or at least logs sufficient to cover the streak.
 * For production, we might limit fetching to last 365 days or logic optimized for the longest streak.
 */
export const calculateStreak = (habit: Habit, logs: HabitLog[]) => {
    // Sort logs descending (newest first)
    const sortedLogs = [...logs]
        .filter(l => l.completed)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedLogs.length === 0) {
        return { currentStreak: 0, longestStreak: habit.longestStreak };
    }

    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);

    let currentStreak = 0;

    // Check if the most recent log is today or yesterday (to keep the streak alive)
    const lastLogDate = startOfDay(new Date(sortedLogs[0].date));

    // If last log is older than yesterday, streak is broken.
    if (differenceInCalendarDays(today, lastLogDate) > 1) {
        currentStreak = 0;
    } else {
        // Count backwards
        let checkDate = lastLogDate;
        for (const log of sortedLogs) {
            const logDate = startOfDay(new Date(log.date));

            // If the log is for the expected checkDate, increment
            if (isSameDay(logDate, checkDate)) {
                currentStreak++;
                checkDate = subDays(checkDate, 1);
            }
            // If we have multiple logs for same day (shouldn't happen with unique constraint but safety)
            else if (isSameDay(logDate, subDays(checkDate, -1))) {
                continue; // Skip duplicate day
            }
            // Gap found
            else {
                break;
            }
        }
    }

    // Logic to update longest streak
    const newLongestStreak = Math.max(habit.longestStreak, currentStreak);

    return { currentStreak, longestStreak: newLongestStreak };
};
