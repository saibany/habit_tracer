import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import type { Badge, Challenge } from './queries';

// ============================================
// XP TYPES
// ============================================

export interface XpEconomy {
    habitBase: number;
    streakBonusPerDay: number;
    streakBonusCap: number;
    perfectDayBonus: number;
    badgeXp: Record<string, { min: number; max: number }>;
    challengeXp: Record<string, number>;
    streakMilestones: { days: number; bonus: number }[];
    levelFormula: string;
}

export interface XpBreakdown {
    totalXp: number;
    level: number;
    xpToday: number;
    xpThisWeek: number;
    xpThisMonth: number;
    avgXpPerDay: number;
    totalTransactions: number;
    sourceBreakdown: {
        source: string;
        totalXp: number;
        transactionCount: number;
        percentage: number;
    }[];
    levelProgress: {
        currentLevel: number;
        xpForCurrentLevel: number;
        xpForNextLevel: number;
        xpInCurrentLevel: number;
        xpNeededForNextLevel: number;
        progressPercent: number;
    };
    economy: XpEconomy;
}

export interface XpTransaction {
    id: string;
    amount: number;
    source: string;
    sourceId?: string;
    sourceName: string;
    sourceIcon: string;
    createdAt: string;
}

export interface XpHistory {
    transactions: XpTransaction[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface LevelInfo {
    totalXp: number;
    currentLevel: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    xpToNextLevel: number;
    progressPercent: number;
    levelCurve: {
        level: number;
        xpRequired: number;
        xpForNext: number;
    }[];
}

// ============================================
// BADGE TYPES
// ============================================

export interface RecentBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    tier: string;
    rarity: string;
    xpReward: number;
    earnedAt: string;
}

export interface NextGoal {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    tier: string;
    threshold: number;
    progress: number;
    progressPercent: number;
    remaining: number;
}

// ============================================
// CHALLENGE TYPES
// ============================================

export interface ChallengeHistoryItem {
    id: string;
    title: string;
    description?: string;
    type: string;
    targetType: string;
    targetValue: number;
    difficulty: string;
    xpReward: number;
    state: string;
    progress: number;
    progressPercent: number;
    joinedAt: string;
    completedAt?: string;
    startDate: string;
    endDate?: string;
}

// ============================================
// XP QUERIES
// ============================================

export const useXpBreakdown = () => {
    return useQuery({
        queryKey: ['xp', 'breakdown'],
        queryFn: async () => {
            const { data } = await api.get<XpBreakdown>('/xp/breakdown');
            return data;
        }
    });
};

export const useXpHistory = (limit = 20) => {
    return useQuery({
        queryKey: ['xp', 'history', limit],
        queryFn: async () => {
            const { data } = await api.get<XpHistory>(`/xp/history?limit=${limit}`);
            return data;
        }
    });
};

export const useLevelInfo = () => {
    return useQuery({
        queryKey: ['xp', 'level'],
        queryFn: async () => {
            const { data } = await api.get<LevelInfo>('/xp/level');
            return data;
        }
    });
};

// ============================================
// BADGE QUERIES
// ============================================

export const useRecentBadges = () => {
    return useQuery({
        queryKey: ['badges', 'recent'],
        queryFn: async () => {
            const { data } = await api.get<{ badges: RecentBadge[] }>('/badges/recent');
            return data.badges;
        }
    });
};

export const useNextGoals = () => {
    return useQuery({
        queryKey: ['badges', 'next-goal'],
        queryFn: async () => {
            const { data } = await api.get<{ nextGoals: NextGoal[]; totalRemaining: number }>('/badges/next-goal');
            return data;
        }
    });
};

export const useBadgeDetail = (id: string) => {
    return useQuery({
        queryKey: ['badges', id],
        queryFn: async () => {
            const { data } = await api.get<Badge & { tierIndex: number; progressPercent: number }>(`/badges/${id}`);
            return data;
        },
        enabled: !!id
    });
};

// ============================================
// CHALLENGE QUERIES
// ============================================

export const useChallenges = () => {
    return useQuery({
        queryKey: ['challenges'],
        queryFn: async () => {
            const { data } = await api.get<{ challenges: Challenge[]; stats: any }>('/challenges');
            return data.challenges;
        }
    });
};

export const useChallengeHistory = () => {
    return useQuery({
        queryKey: ['challenges', 'history'],
        queryFn: async () => {
            const { data } = await api.get<{ history: ChallengeHistoryItem[]; total: number }>('/challenges/history');
            return data;
        }
    });
};

export const useChallengeDetail = (id: string) => {
    return useQuery({
        queryKey: ['challenges', id],
        queryFn: async () => {
            const { data } = await api.get<Challenge & { daysRemaining: number | null }>(`/challenges/${id}`);
            return data;
        },
        enabled: !!id
    });
};

export const useCreateChallenge = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (challenge: Partial<Challenge>) => {
            const { data } = await api.post<Challenge>('/challenges', challenge);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['challenges'] });
        }
    });
};
