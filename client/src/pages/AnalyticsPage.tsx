import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp, Target, Flame, Trophy } from 'lucide-react';
import { useCompletionStats, useStreakTrends, useXpProgression, useHeatmap } from '../lib/queries';
import { Heatmap } from '../components/analytics/Heatmap';
import { cn } from '../lib/utils';

export const AnalyticsPage = () => {
    const [period, setPeriod] = useState<'week' | 'month'>('week');

    const { data: completionData, isLoading: completionLoading } = useCompletionStats(period);
    const { data: streakData, isLoading: streakLoading } = useStreakTrends();
    const { data: xpData, isLoading: xpLoading } = useXpProgression();
    const { data: heatmapData } = useHeatmap();

    const isLoading = completionLoading || streakLoading || xpLoading;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analytics</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Track your progress and identify patterns</p>
            </motion.header>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                        <StatCard
                            icon={<Target className="w-5 h-5" />}
                            label="Completion Rate"
                            value={`${completionData?.overallRate || 0}%`}
                            color="from-teal-500 to-emerald-500"
                        />
                        <StatCard
                            icon={<Flame className="w-5 h-5" />}
                            label="Total Streaks"
                            value={streakData?.total || 0}
                            color="from-orange-500 to-amber-500"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Avg Streak"
                            value={streakData?.average || 0}
                            color="from-indigo-500 to-blue-500"
                        />
                        <StatCard
                            icon={<Trophy className="w-5 h-5" />}
                            label="Total XP"
                            value={xpData?.[xpData.length - 1]?.total || 0}
                            color="from-purple-500 to-pink-500"
                        />
                    </motion.div>

                    {/* Period Toggle & Completion Chart */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Completion by Habit</h2>
                            <div className="flex gap-2">
                                {(['week', 'month'] as const).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPeriod(p)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors",
                                            period === p
                                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {completionData?.habits?.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-8">No habit data for this period.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={completionData?.habits || []}>
                                    <XAxis
                                        dataKey="title"
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        stroke="currentColor"
                                        className="text-slate-500 dark:text-slate-400"
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        stroke="currentColor"
                                        className="text-slate-500 dark:text-slate-400"
                                    />
                                    <Tooltip
                                        formatter={(value: number) => [`${value}%`, 'Completion']}
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            backgroundColor: 'var(--tooltip-bg, white)'
                                        }}
                                    />
                                    <Bar dataKey="rate" fill="#6366F1" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </motion.section>

                    {/* XP Progression */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
                    >
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">XP Progression</h2>
                        {xpData?.length === 0 ? (
                            <p className="text-slate-500 dark:text-slate-400 text-center py-8">Complete some habits to see your XP growth!</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={xpData || []}>
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        stroke="currentColor"
                                        className="text-slate-500 dark:text-slate-400"
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: 'currentColor' }}
                                        stroke="currentColor"
                                        className="text-slate-500 dark:text-slate-400"
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: 12,
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                        }}
                                    />
                                    <defs>
                                        <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                                            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.05} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#8B5CF6"
                                        strokeWidth={2}
                                        fill="url(#xpGradient)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </motion.section>

                    {/* Yearly Heatmap */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
                    >
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Yearly Activity</h2>
                        <Heatmap data={heatmapData || []} />
                    </motion.section>
                </>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm"
    >
        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br text-white flex items-center justify-center mb-3", color)}>
            {icon}
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
);
