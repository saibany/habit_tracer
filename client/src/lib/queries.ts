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
// HABITS
// ============================================

export const useHabits = (status = 'active') => {
    return useQuery({
        queryKey: ['habits', status],
        queryFn: async () => {
            const { data } = await api.get<Habit[]>(`/habits?status=${status}`);
            return data;
        }
    });
};

export const useHabit = (id: string) => {
    return useQuery({
        queryKey: ['habit', id],
        queryFn: async () => {
            const { data } = await api.get<Habit>(`/habits/${id}`);
            return data;
        },
        enabled: !!id
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

export const useLogHabit = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, date, value }: { id: string; date: string; value?: number }) => {
            const { data } = await api.post(`/habits/${id}/log`, { date, value });
            return data as { log: HabitLog; streak: { current: number; longest: number }; xpEarned: number };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['habits'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['habits'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }
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
        }
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
