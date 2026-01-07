import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';

// ============================================
// TYPES
// ============================================

export interface Habit {
    id: string;
    title: string;
    description?: string;
    notes?: string;
    color: string;
    icon?: string;
    frequency: string;
    frequencyDays?: string;
    timeOfDay?: string;
    estimatedMins?: number;
    goal: number;
    unit?: string;
    priority: string;
    status: string;
    currentStreak: number;
    longestStreak: number;
    createdAt: string;
    logs: HabitLog[];
    category?: Category;
}

export interface HabitLog {
    id: string;
    date: string;
    value: number;
    completed: boolean;
    notes?: string;
    xpEarned: number;
}

export interface Task {
    id: string;
    title: string;
    description?: string;
    notes?: string;
    priority: string;
    status: string;
    dueDate?: string;
    dueTime?: string;
    estimatedMins?: number;
    completedAt?: string;
    xpEarned: number;
    category?: Category;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    icon?: string;
}

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    color: string;
    startDate: string;
    endDate?: string;
    allDay: boolean;
}

export interface AnalyticsSummary {
    user: { name: string; xp: number; level: number };
    stats: {
        totalHabits: number;
        totalStreaks: number;
        bestStreak: number;
        weeklyCompletionRate: number;
    };
}

export interface HeatmapData {
    date: string;
    count: number;
}

// ============================================
// GAMIFICATION
// ============================================

export interface Badge {
    id: string;
    name: string;
    description: string;
    category: 'streak' | 'consistency' | 'volume' | 'discipline' | 'special' | 'seasonal';
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    threshold: number;
    xpReward: number;
    icon: string;
    color: string;
    state: 'locked' | 'in_progress' | 'earned';
    progress: number;
    earnedAt?: string;
    earned?: boolean; // specialized getter in frontend if needed, but 'state' is primary
}

export interface Challenge {
    id: string;
    title: string;
    description?: string;
    type: 'personal' | 'global' | 'group';
    targetType: string;
    targetValue: number;
    status: 'upcoming' | 'active' | 'completed' | 'expired';
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    xpReward: number;
    startDate: string;
    endDate?: string;
    participantCount: number;
    joined: boolean;
    participantState?: 'active' | 'completed' | 'withdrawn';
    progress: number;
    completedAt?: string | null;
    timeRemaining?: number; // Added by controller
}

// ============================================
// HABITS
// ============================================

export const useHabits = (status = 'active') => {
    return useQuery({
        queryKey: ['habits', status],
        queryFn: async () => {
            const { data } = await api.get<Habit[]>(`/habits?status=${status}`);
            return data;
        },
        staleTime: 30 * 1000, // 30 seconds - reduces refetching on focus/mount
        gcTime: 5 * 60 * 1000, // 5 minutes cache
    });
};

export const useHabit = (id: string) => {
    return useQuery({
        queryKey: ['habit', id],
        queryFn: async () => {
            const { data } = await api.get<Habit>(`/habits/${id}`);
            return data;
        },
        enabled: !!id,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
};

export const useCreateHabit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (habit: Partial<Habit>) => {
            const { data } = await api.post<Habit>('/habits', habit);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['habits'] });
        }
    });
};

export const useUpdateHabit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...habit }: Partial<Habit> & { id: string }) => {
            const { data } = await api.put<Habit>(`/habits/${id}`, habit);
            return data;
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['habits'] });
            queryClient.invalidateQueries({ queryKey: ['habit', id] });
        }
    });
};

export const useDeleteHabit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/habits/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['habits'] });
        }
    });
};

import { useAuth } from '../context/AuthContext';

export const useLogHabit = () => {
    const queryClient = useQueryClient();
    const { updateUser } = useAuth();

    return useMutation({
        mutationFn: async ({ id, date, value }: { id: string; date: string; value?: number }) => {
            const { data } = await api.post(`/habits/${id}/log`, { date, value });
            return data as {
                log: HabitLog;
                streak: { current: number; longest: number };
                xpEarned: number;
                newLevel?: number;
                newBadges?: Badge[];
                levelUp?: any;
            };
        },
        onMutate: async ({ id, date, value }) => {
            await queryClient.cancelQueries({ queryKey: ['habits'] });
            await queryClient.cancelQueries({ queryKey: ['habit', id] });

            const previousHabits = queryClient.getQueryData<Habit[]>(['habits', 'active']);
            const previousHabit = queryClient.getQueryData<Habit>(['habit', id]);

            // Optimistic Update for List
            if (previousHabits) {
                queryClient.setQueryData<Habit[]>(['habits', 'active'], (old) => {
                    return old?.map(h => {
                        if (h.id === id) {
                            // Optimistically add log and increment streak
                            const newLog = {
                                id: 'temp-' + Date.now(),
                                date,
                                value: value || 1,
                                completed: true,
                                xpEarned: 0 // placeholder
                            };
                            return {
                                ...h,
                                logs: [newLog, ...h.logs],
                                currentStreak: h.currentStreak + 1,
                                lastCompletedAt: date
                            };
                        }
                        return h;
                    });
                });
            }

            return { previousHabits, previousHabit };
        },
        onError: (_err, _newHabit, context) => {
            if (context?.previousHabits) {
                queryClient.setQueryData(['habits', 'active'], context.previousHabits);
            }
            if (context?.previousHabit) {
                queryClient.setQueryData(['habit', context.previousHabit.id], context.previousHabit);
            }
        },
        onSuccess: (data, variables) => {
            // Update specific habit in list with server data
            queryClient.setQueryData<Habit[]>(['habits', 'active'], (old) => {
                return old?.map(h => {
                    if (h.id === variables.id) {
                        return {
                            ...h,
                            currentStreak: data.streak.current,
                            longestStreak: data.streak.longest,
                            logs: [data.log, ...h.logs.filter(l => !l.id.startsWith('temp-'))]
                        };
                    }
                    return h;
                });
            });

            // Handle XP / Badges / Level Up - INSTANT UI UPDATE
            if (data.xpEarned > 0 || data.newLevel || (data.newBadges && data.newBadges.length > 0)) {

                const finalLevel = data.newLevel ?? data.levelUp?.newLevel;
                const finalXp = (data as any).newTotalXp;

                if (finalXp !== undefined) {
                    updateUser({ xp: finalXp, ...(finalLevel ? { level: finalLevel } : {}) });
                } else {
                    queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
                }

                if (data.newBadges && data.newBadges.length > 0) {
                    queryClient.invalidateQueries({ queryKey: ['badges'] });
                }
            }

            // Invalidate analytics (heatmap, summary) since completion affects them
            // Use a small delay to avoid race condition with the main cache update
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['analytics'] });
                queryClient.invalidateQueries({ queryKey: ['heatmap'] });
            }, 100);
        }
    });
};

export const useUndoHabitLog = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, date }: { id: string; date: string }) => {
            const { data } = await api.post(`/habits/${id}/undo`, { date });
            return data;
        },
        onMutate: async ({ id, date }) => {
            await queryClient.cancelQueries({ queryKey: ['habits'] });
            const previousHabits = queryClient.getQueryData<Habit[]>(['habits', 'active']);

            if (previousHabits) {
                queryClient.setQueryData<Habit[]>(['habits', 'active'], (old) => {
                    return old?.map(h => {
                        if (h.id === id) {
                            return {
                                ...h,
                                logs: h.logs.filter(l => l.date !== date),
                                currentStreak: Math.max(0, h.currentStreak - 1) // Rough est
                            };
                        }
                        return h;
                    });
                });
            }
            return { previousHabits };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousHabits) {
                queryClient.setQueryData(['habits', 'active'], context.previousHabits);
            }
        },
        onSuccess: () => {
            // Invalidate analytics after undo
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['heatmap'] });
            queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        }
    });
};

// ============================================
// BADGES
// ============================================

export const useBadges = () => {
    return useQuery({
        queryKey: ['badges'],
        queryFn: async () => {
            const { data } = await api.get<{ badges: Badge[] }>('/badges');
            return data.badges;
        },
        staleTime: 60 * 1000, // 1 minute - badges change infrequently
        gcTime: 10 * 60 * 1000, // 10 minutes cache
    });
};

// ============================================
// CHALLENGES
// ============================================

export const useChallenges = () => {
    return useQuery({
        queryKey: ['challenges'],
        queryFn: async () => {
            const { data } = await api.get<{ challenges: Challenge[] }>('/challenges');
            return data.challenges;
        },
        staleTime: 60 * 1000, // 1 minute
        gcTime: 10 * 60 * 1000,
    });
};

export const useJoinChallenge = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/challenges/${id}/join`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['challenges'] });
        }
    });
};

export const useLeaveChallenge = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/challenges/${id}/leave`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['challenges'] });
        }
    });
};

export const useChallengeLeaderboard = (id: string) => {
    return useQuery({
        queryKey: ['challenge-leaderboard', id],
        queryFn: async () => {
            const { data } = await api.get<{ leaderboard: { userId: string; name: string; avatar?: string; progress: number; rank: number; completedAt?: string | null; isCurrentUser: boolean }[] }>(`/challenges/${id}/leaderboard`);
            return data.leaderboard;
        },
        enabled: !!id
    });
};

// ============================================
// TASKS
// ============================================

export const useTasks = (status?: string) => {
    return useQuery({
        queryKey: ['tasks', status],
        queryFn: async () => {
            const params = status ? `?status=${status}` : '';
            const { data } = await api.get<Task[]>(`/tasks${params}`);
            return data;
        }
    });
};

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (task: Partial<Task>) => {
            const { data } = await api.post<Task>('/tasks', task);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });
};

export const useCompleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.post(`/tasks/${id}/complete`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
    });
};

// ============================================
// ANALYTICS
// ============================================

export const useAnalyticsSummary = () => {
    return useQuery({
        queryKey: ['analytics', 'summary'],
        queryFn: async () => {
            const { data } = await api.get<AnalyticsSummary>('/analytics/summary');
            return data;
        },
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });
};

export const useHeatmap = () => {
    return useQuery({
        queryKey: ['analytics', 'heatmap'],
        queryFn: async () => {
            const { data } = await api.get<HeatmapData[]>('/analytics/heatmap');
            return data;
        }
    });
};

export const useCompletionStats = (period: 'week' | 'month' = 'week') => {
    return useQuery({
        queryKey: ['analytics', 'completion', period],
        queryFn: async () => {
            const { data } = await api.get(`/analytics/completion?period=${period}`);
            return data;
        }
    });
};

export const useStreakTrends = () => {
    return useQuery({
        queryKey: ['analytics', 'streaks'],
        queryFn: async () => {
            const { data } = await api.get('/analytics/streaks');
            return data;
        }
    });
};

export const useXpProgression = () => {
    return useQuery({
        queryKey: ['analytics', 'xp'],
        queryFn: async () => {
            const { data } = await api.get('/analytics/xp');
            return data;
        }
    });
};

// ============================================
// CALENDAR
// ============================================

export const useCalendarEvents = (from: string, to: string) => {
    return useQuery({
        queryKey: ['calendar', from, to],
        queryFn: async () => {
            const { data } = await api.get<CalendarEvent[]>(`/calendar?from=${from}&to=${to}`);
            return data;
        },
        enabled: !!from && !!to
    });
};

export const useCreateEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (event: Partial<CalendarEvent>) => {
            const { data } = await api.post<CalendarEvent>('/calendar', event);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar'] });
        }
    });
};

// ============================================
// SETTINGS
// ============================================

export const useSettings = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await api.get('/settings');
            return data;
        }
    });
};

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (settings: Record<string, unknown>) => {
            const { data } = await api.put('/settings', settings);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        }
    });
};

export const useExportData = () => {
    return useMutation({
        mutationFn: async () => {
            const { data } = await api.get('/settings/export');
            return data;
        }
    });
};

export const useDeleteAccount = () => {
    return useMutation({
        mutationFn: async (password: string) => {
            const { data } = await api.post('/settings/delete-account', { password });
            return data;
        }
    });
};
