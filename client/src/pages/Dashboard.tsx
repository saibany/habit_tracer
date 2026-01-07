import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Flame, Target, TrendingUp, Calendar, Zap } from 'lucide-react';
import { useHabits, useLogHabit, useUndoHabitLog, useAnalyticsSummary, useHeatmap, Habit } from '../lib/queries';
import { useXpBreakdown } from '../lib/gamificationQueries';
import { useAuth } from '../context/AuthContext';
import { CreateHabitModal } from '../components/habits/CreateHabitModal';
import { XpDetailsModal, BadgeUnlockAnimation } from '../components/gamification';
import { Heatmap } from '../components/analytics/Heatmap';
import { cn } from '../lib/utils';

export const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isXpModalOpen, setIsXpModalOpen] = useState(false);
    const [unlockedBadge, setUnlockedBadge] = useState<any | null>(null);

    const { data: habits, isLoading: habitsLoading } = useHabits('active');
    const { data: summary } = useAnalyticsSummary();
    const { data: heatmapData } = useHeatmap();
    const { data: xpData } = useXpBreakdown();
    const logHabit = useLogHabit();
    const undoLog = useUndoHabitLog();

    const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const todayDayOfWeek = getDay(new Date()); // 0 = Sunday, 6 = Saturday

    // Filter habits to only show those scheduled for today
    const todaysHabits = useMemo(() => {
        if (!habits) return [];

        return habits.filter((habit: Habit) => {
            // If no frequencyDays set, show every day (daily habit)
            if (!habit.frequencyDays) return true;

            // Parse frequencyDays (e.g., "0,1,2,3,4") and check if today is included
            const scheduledDays = habit.frequencyDays.split(',').map(Number);
            return scheduledDays.includes(todayDayOfWeek);
        });
    }, [habits, todayDayOfWeek]);

    const handleToggleHabit = (e: React.MouseEvent, habitId: string, isCompleted: boolean) => {
        e.stopPropagation(); // Prevent navigation when clicking checkbox
        if (isCompleted) {
            undoLog.mutate({ id: habitId, date: today });
        } else {
            logHabit.mutate({ id: habitId, date: today }, {
                onSuccess: (data: any) => {
                    if (data.newBadges && data.newBadges.length > 0) {
                        setUnlockedBadge(data.newBadges[0]);
                    }
                }
            });
        }
    };

    const completedToday = todaysHabits.filter((h: Habit) =>
        h.logs.some(l => format(new Date(l.date), 'yyyy-MM-dd') === today && l.completed)
    ).length;

    const totalTodaysHabits = todaysHabits.length;
    const progress = totalTodaysHabits > 0 ? (completedToday / totalTodaysHabits) * 100 : 0;

    // Get greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <AnimatePresence>
                {isModalOpen && (
                    <CreateHabitModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* XP Details Modal */}
            <XpDetailsModal
                isOpen={isXpModalOpen}
                onClose={() => setIsXpModalOpen(false)}
            />

            {/* Badge Unlock Animation */}
            {unlockedBadge && (
                <BadgeUnlockAnimation
                    badge={unlockedBadge}
                    onClose={() => setUnlockedBadge(null)}
                />
            )}

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                        {greeting}, <span className="text-gradient-cosmic">{user?.name?.split(' ')[0] || 'there'}</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(), 'EEEE, MMMM d')}
                    </p>

                    {totalTodaysHabits > 0 && (
                        <div className="flex items-center gap-4 mt-6">
                            <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 rounded-full relative overflow-hidden"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "circOut" }}
                                >
                                    <div className="absolute inset-0 animate-shimmer opacity-30" />
                                </motion.div>
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {completedToday}/{totalTodaysHabits} complete
                            </span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white px-6 py-3.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-teal-500/25 active:scale-95 group"
                >
                    <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    <span>New Habit</span>
                </button>
            </motion.header>

            {/* Stats Cards */}
            {summary && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <div className="glass-card p-5 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-orange-100 dark:bg-orange-500/10 rounded-xl">
                                <Flame className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.totalStreaks}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Active Streaks</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-teal-100 dark:bg-teal-500/10 rounded-xl">
                                <TrendingUp className="w-5 h-5 text-teal-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.bestStreak}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Best Streak</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl">
                                <Target className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.totalHabits}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Habits</p>
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-100 dark:bg-purple-500/10 rounded-xl">
                                <Calendar className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.weeklyCompletionRate}%</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Weekly Rate</p>
                            </div>
                        </div>
                    </div>

                    {/* XP / Level Card - Clickable */}
                    <button
                        onClick={() => setIsXpModalOpen(true)}
                        className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900/80 dark:to-purple-900/80 p-6 rounded-2xl shadow-lg hover:shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95 text-left col-span-2 md:col-span-4 relative overflow-hidden group border border-white/10"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                                <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-end justify-between mb-2">
                                    <div className="flex items-baseline gap-3">
                                        <p className="text-3xl font-bold text-white">Level {xpData?.level || 1}</p>
                                        <p className="text-sm text-indigo-200 font-medium">Rank Title</p>
                                    </div>
                                    <p className="text-sm text-indigo-200 font-medium">{xpData?.totalXp?.toLocaleString() || 0} XP</p>
                                </div>
                                <div className="h-2.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-yellow-300 to-amber-500 rounded-full shadow-[0_0_10px_rgba(252,211,77,0.5)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${xpData?.levelProgress?.progressPercent || 0}%` }}
                                        transition={{ duration: 1 }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <p className="text-xs text-indigo-200">Current Progress</p>
                                    <p className="text-xs text-indigo-200">{Math.round(xpData?.levelProgress?.progressPercent || 0)}% to next level</p>
                                </div>
                            </div>
                        </div>
                    </button>
                </motion.div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Habits Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                            Today's Habits
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-xs font-medium text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5">
                                {todaysHabits.length}
                            </span>
                        </h3>
                        {habits && habits.length > todaysHabits.length && (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {habits.length - todaysHabits.length} more not scheduled
                            </span>
                        )}
                    </div>

                    {habitsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                    ) : todaysHabits.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-panel p-8 rounded-2xl border-dashed border-2 border-slate-200/50 dark:border-slate-700/50 text-center"
                        >
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-700">
                                <Calendar className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
                                {habits?.length === 0 ? "No habits yet" : "No habits scheduled for today"}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                {habits?.length === 0
                                    ? "Create your first habit to get started!"
                                    : "Enjoy your day off, or add a new habit!"}
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center justify-center gap-1 w-full"
                            >
                                <Plus className="w-4 h-4" /> Add a new habit
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col gap-3"
                        >
                            {todaysHabits.map((habit: Habit, index: number) => {
                                const isCompletedToday = habit.logs.some(
                                    l => format(new Date(l.date), 'yyyy-MM-dd') === today && l.completed
                                );
                                return (
                                    <motion.div
                                        key={habit.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => navigate(`/habits/${habit.id}`)}
                                        className={cn(
                                            "p-4 rounded-2xl cursor-pointer transition-all duration-300",
                                            isCompletedToday
                                                ? "bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 opacity-70"
                                                : "glass-card border border-white/20 dark:border-white/5 hover:-translate-y-1 hover:shadow-lg"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Checkbox */}
                                            <button
                                                onClick={(e) => handleToggleHabit(e, habit.id, isCompletedToday)}
                                                className={cn(
                                                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-sm",
                                                    isCompletedToday
                                                        ? "bg-teal-500 text-white shadow-teal-500/20 scale-95"
                                                        : "bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-500 hover:scale-105"
                                                )}
                                            >
                                                {isCompletedToday && (
                                                    <motion.svg
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-6 h-6"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </motion.svg>
                                                )}
                                            </button>

                                            {/* Color and Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{ backgroundColor: habit.color }}
                                                    />
                                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{habit.category?.name || 'General'}</span>
                                                </div>
                                                <h4 className={cn(
                                                    "font-bold text-lg text-slate-900 dark:text-white truncate transition-colors",
                                                    isCompletedToday && "line-through text-slate-500 dark:text-slate-500"
                                                )}>
                                                    {habit.title}
                                                </h4>
                                            </div>

                                            {/* Streak Badge */}
                                            {habit.currentStreak > 0 && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg border border-orange-100 dark:border-orange-500/20 shrink-0">
                                                    <Flame className="w-4 h-4 text-orange-500" />
                                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                                        {habit.currentStreak}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-panel p-6 rounded-2xl"
                    >
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-500" /> Activity
                        </h3>
                        <Heatmap data={heatmapData || []} />
                    </motion.section>
                </div>
            </div>
        </div >
    );
};
