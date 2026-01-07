import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, TrendingUp, Calendar, Award, Flame, Trophy, CheckCircle } from 'lucide-react';
import { useXpBreakdown, useXpHistory } from '../../lib/gamificationQueries';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface XpDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SOURCE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    habit_complete: { icon: CheckCircle, color: 'text-green-500', label: 'Habits' },
    badge_unlock: { icon: Award, color: 'text-purple-500', label: 'Badges' },
    challenge_complete: { icon: Trophy, color: 'text-amber-500', label: 'Challenges' },
    streak_bonus: { icon: Flame, color: 'text-orange-500', label: 'Streaks' },
    perfect_week: { icon: Calendar, color: 'text-indigo-500', label: 'Perfect Weeks' },
};

export const XpDetailsModal = ({ isOpen, onClose }: XpDetailsModalProps) => {
    const { data: breakdown } = useXpBreakdown();
    const { data: history, isLoading: historyLoading } = useXpHistory(30);
    const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rules'>('overview');

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shrink-0">
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl">
                                <Zap className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">XP Details</h2>
                                <p className="text-white/80">Track your experience points</p>
                            </div>
                        </div>

                        {/* Level Progress */}
                        {breakdown && (
                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-semibold">Level {breakdown.level}</span>
                                    <span className="text-sm opacity-80">
                                        {breakdown.totalXp.toLocaleString()} XP Total
                                    </span>
                                </div>
                                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${breakdown.levelProgress.progressPercent}%` }}
                                        transition={{ duration: 1, ease: 'easeOut' }}
                                        className="h-full bg-white rounded-full"
                                    />
                                </div>
                                <div className="flex justify-between text-sm opacity-80">
                                    <span>{breakdown.levelProgress.xpInCurrentLevel} / {breakdown.levelProgress.xpNeededForNextLevel}</span>
                                    <span>Level {breakdown.level + 1}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
                        {(['overview', 'history', 'rules'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 py-3 px-4 text-sm font-medium transition-colors relative capitalize",
                                    activeTab === tab
                                        ? "text-indigo-600 dark:text-indigo-400"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                            >
                                {tab}
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="tab-indicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-sm font-medium">Today</span>
                                        </div>
                                        <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                                            +{breakdown?.xpToday || 0}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="text-sm font-medium">This Week</span>
                                        </div>
                                        <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                            +{breakdown?.xpThisWeek || 0}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:from-purple-900/20 dark:to-fuchsia-900/20 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                                            <Calendar className="w-4 h-4" />
                                            <span className="text-sm font-medium">This Month</span>
                                        </div>
                                        <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                                            +{breakdown?.xpThisMonth || 0}
                                        </p>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-2xl">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                                            <Zap className="w-4 h-4" />
                                            <span className="text-sm font-medium">Daily Avg</span>
                                        </div>
                                        <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                                            {breakdown?.avgXpPerDay || 0}
                                        </p>
                                    </div>
                                </div>

                                {/* Source Breakdown */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                        XP by Source
                                    </h3>
                                    <div className="space-y-2">
                                        {breakdown?.sourceBreakdown.map((source) => {
                                            const config = SOURCE_CONFIG[source.source] || {
                                                icon: Zap,
                                                color: 'text-slate-500',
                                                label: source.source
                                            };
                                            const Icon = config.icon;
                                            const percentage = source.percentage || 0;

                                            return (
                                                <div
                                                    key={source.source}
                                                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                                                >
                                                    <div className={cn("p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm", config.color)}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                                                {config.label}
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {source.totalXp.toLocaleString()} XP
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-500 rounded-full transition-all"
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-3">
                                {historyLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                                    </div>
                                ) : history?.transactions.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <Zap className="w-12 h-12 mx-auto opacity-20 mb-2" />
                                        <p>No XP earned yet. Complete habits to get started!</p>
                                    </div>
                                ) : (
                                    history?.transactions.map((tx) => (
                                        <motion.div
                                            key={tx.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl"
                                        >
                                            <span className="text-2xl">{tx.sourceIcon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                                    {tx.sourceName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                                <Zap className="w-4 h-4" />
                                                +{tx.amount}
                                            </span>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'rules' && breakdown?.economy && (
                            <div className="space-y-6">
                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Habits & Streaks</h3>
                                    <div className="grid gap-3">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                                            <span>Habit Completion</span>
                                            <span className="font-bold text-indigo-600">+{breakdown.economy.habitBase} XP</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                                            <span>Perfect Day Bonus</span>
                                            <span className="font-bold text-indigo-600">+{breakdown.economy.perfectDayBonus} XP</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                                            <span>Streak Bonus</span>
                                            <span className="font-bold text-indigo-600">+{breakdown.economy.streakBonusPerDay} XP / day</span>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Badges & Challenges</h3>
                                    <div className="grid gap-3">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                                            <span>Badge Unlock</span>
                                            <span className="font-bold text-indigo-600">
                                                {breakdown.economy.badgeXp.bronze.min}-{breakdown.economy.badgeXp.platinum.max} XP
                                            </span>
                                        </div>
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl flex justify-between items-center">
                                            <span>Challenge Completion</span>
                                            <span className="font-bold text-indigo-600">
                                                {breakdown.economy.challengeXp.easy}-{breakdown.economy.challengeXp.extreme} XP
                                            </span>
                                        </div>
                                    </div>
                                </section>

                                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center">
                                    <p className="text-sm text-indigo-900 dark:text-indigo-200">
                                        <strong>Level Formula:</strong> {breakdown.economy.levelFormula}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default XpDetailsModal;
