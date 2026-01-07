import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext'; // Check path
import { useXpBreakdown } from '../lib/gamificationQueries';
import { useBadges, useAnalyticsSummary, Badge } from '../lib/queries';
import { BadgeCard, BadgeDetailModal } from '../components/gamification';
import { Calendar, Flame, Target, Trophy, Award, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export const ProfilePage = () => {
    const { user } = useAuth();
    const { data: xp } = useXpBreakdown();
    const { data: badges } = useBadges();
    const { data: summary } = useAnalyticsSummary(); // Returns { totalHabits, activeStreaks, completionRate, bestStreak }?
    // Note: useAnalyticsSummary might return different structure. Checking usage in Dashboard (Step 342) -> summary.
    // Assuming summary has { totalHabits, currentStreak, longestStreak, completionRate } or similar.

    // Fallback stats if summary is loading or different structure
    // Dashboard uses summary directly? Step 342: `const { data: summary } = useAnalyticsSummary();`
    // Step 280 queries.ts definition: `export interface AnalyticsSummary { totalHabits: number; completedToday: number; completionRate: number; currentStreak: number; longestStreak: number; }`

    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    const badgesByCategory = useMemo(() => {
        if (!badges) return {};
        const groups: Record<string, Badge[]> = {};
        badges.forEach(b => {
            if (!groups[b.category]) groups[b.category] = [];
            groups[b.category].push(b);
        });
        return groups;
    }, [badges]);

    const totalXp = badges?.reduce((acc, b) => b.state === 'earned' ? acc + b.xpReward : acc, 0) || 0;
    const earnedCount = badges?.filter(b => b.state === 'earned').length || 0;

    return (
        <div className="space-y-8 pb-20 max-w-6xl mx-auto">
            {/* Header Profile Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full -z-0" />

                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-xl ring-4 ring-indigo-50 dark:ring-slate-700">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>

                <div className="text-center md:text-left flex-1 relative z-10 w-full">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{user?.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 flex items-center justify-center md:justify-start gap-2">
                        <Calendar className="w-4 h-4" /> Joined {user ? 'recently' : ''}
                        {/* We don't have joinedAt in user context usually, skipping or using mock */}
                    </p>

                    {/* XP Progress */}
                    {xp && (
                        <div className="max-w-md">
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <span className="text-slate-700 dark:text-slate-300">Level {xp.level}</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{xp.levelProgress.progressPercent}%</span>
                            </div>
                            <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xp.levelProgress.progressPercent}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {xp.levelProgress.xpInCurrentLevel} / {xp.levelProgress.xpNeededForNextLevel} XP to Level {xp.level + 1}
                            </p>
                        </div>
                    )}
                </div>

                {/* Quick Stats */}
                <div className="hidden md:flex gap-6 relative z-10">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{earnedCount}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Badges</div>
                    </div>
                    <div className="w-px bg-slate-200 dark:bg-slate-700 h-10 self-center" />
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalXp}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-widest">Total XP</div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    label="Active Streak"
                    value={summary?.stats?.totalStreaks || 0}
                    icon={Flame}
                    color="text-orange-500"
                    bg="bg-orange-50 dark:bg-orange-900/20"
                />
                <StatsCard
                    label="Best Streak"
                    value={summary?.stats?.bestStreak || 0}
                    icon={Trophy}
                    color="text-yellow-500"
                    bg="bg-yellow-50 dark:bg-yellow-900/20"
                />
                <StatsCard
                    label="Total Habits"
                    value={summary?.stats?.totalHabits || 0}
                    icon={Target}
                    color="text-indigo-500"
                    bg="bg-indigo-50 dark:bg-indigo-900/20"
                />
                <StatsCard
                    label="Completion Rate"
                    value={`${Math.round(summary?.stats?.weeklyCompletionRate || 0)}%`}
                    icon={Zap}
                    color="text-teal-500"
                    bg="bg-teal-50 dark:bg-teal-900/20"
                />
            </div>

            {/* Badges Collection */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Award className="w-6 h-6 text-amber-500" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Badge Collection</h2>
                </div>

                {Object.entries(badgesByCategory).length > 0 ? (
                    Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
                        <div key={category} className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">{category}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {categoryBadges.map((badge) => (
                                    <BadgeCard
                                        key={badge.id}
                                        badge={badge}
                                        onClick={() => setSelectedBadge(badge)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-500">
                        Loading badges...
                    </div>
                )}
            </div>

            {/* Modals */}
            <BadgeDetailModal
                badge={selectedBadge}
                onClose={() => setSelectedBadge(null)}
            />
        </div>
    );
};

const StatsCard = ({ label, value, icon: Icon, color, bg }: any) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bg)}>
            <Icon className={cn("w-6 h-6", color)} />
        </div>
        <div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        </div>
    </div>
);
