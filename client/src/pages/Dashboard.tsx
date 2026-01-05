import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, getDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Flame, Target, TrendingUp, Calendar } from 'lucide-react';
import { useHabits, useLogHabit, useUndoHabitLog, useAnalyticsSummary, useHeatmap, Habit } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { CreateHabitModal } from '../components/habits/CreateHabitModal';
import { Heatmap } from '../components/analytics/Heatmap';
import { cn } from '../lib/utils';

export const Dashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: habits, isLoading: habitsLoading } = useHabits('active');
    const { data: summary } = useAnalyticsSummary();
    const { data: heatmapData } = useHeatmap();
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
            logHabit.mutate({ id: habitId, date: today });
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

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {greeting}, {user?.name?.split(' ')[0] || 'there'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                        {format(new Date(), 'EEEE, MMMM d')}
                    </p>

                    {totalTodaysHabits > 0 && (
                        <div className="flex items-center gap-4 mt-4">
                            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-teal-400 to-indigo-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: "circOut" }}
                                />
                            </div>
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                {completedToday}/{totalTodaysHabits} complete
                            </span>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                    <Plus className="w-5 h-5" />
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
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                                <Flame className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.totalStreaks}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Active Streaks</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                                <TrendingUp className="w-5 h-5 text-teal-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.bestStreak}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Best Streak</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                                <Target className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.totalHabits}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Total Habits</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                                <Calendar className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{summary.stats.weeklyCompletionRate}%</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Weekly Rate</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Habits Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Today's Habits</h3>
                        {habits && habits.length > todaysHabits.length && (
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                {habits.length - todaysHabits.length} more not scheduled today
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
                            className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center"
                        >
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">
                                {habits?.length === 0 ? "No habits yet" : "No habits scheduled for today"}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                {habits?.length === 0
                                    ? "Create your first habit to get started!"
                                    : "Enjoy your day off, or add a new habit!"}
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                            >
                                + Add a new habit
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
                                            "bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5",
                                            isCompletedToday && "bg-teal-50/50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Checkbox */}
                                            <button
                                                onClick={(e) => handleToggleHabit(e, habit.id, isCompletedToday)}
                                                className={cn(
                                                    "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all shrink-0",
                                                    isCompletedToday
                                                        ? "border-teal-500 bg-teal-500 text-white"
                                                        : "border-slate-200 dark:border-slate-600 hover:border-teal-400"
                                                )}
                                            >
                                                {isCompletedToday && (
                                                    <motion.svg
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="w-5 h-5"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </motion.svg>
                                                )}
                                            </button>

                                            {/* Color indicator */}
                                            <div
                                                className="w-2 h-10 rounded-full shrink-0"
                                                style={{ backgroundColor: habit.color }}
                                            />

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <h4 className={cn(
                                                    "font-semibold text-slate-900 dark:text-white truncate",
                                                    isCompletedToday && "line-through text-slate-500 dark:text-slate-400"
                                                )}>
                                                    {habit.title}
                                                </h4>
                                                {habit.description && (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                                        {habit.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Streak Badge */}
                                            {habit.currentStreak > 0 && (
                                                <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-full shrink-0">
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
                        className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm"
                    >
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Activity</h3>
                        <Heatmap data={heatmapData || []} />
                    </motion.section>

                    {/* Level Progress */}
                    {user && (
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Level {user.level}</h3>
                                <span className="text-sm opacity-80">{user.xp} XP</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(user.xp % 100)}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="h-full bg-white rounded-full"
                                />
                            </div>
                            <p className="text-sm mt-2 opacity-80">
                                {100 - (user.xp % 100)} XP to level {user.level + 1}
                            </p>
                        </motion.section>
                    )}
                </div>
            </div>
        </div>
    );
};
