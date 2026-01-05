import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useHabits, useDeleteHabit, useUpdateHabit } from '../lib/queries';
import { Loader2, Trash2, Archive, RefreshCw, Flame, Plus, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { CreateHabitModal } from '../components/habits/CreateHabitModal';

export const AllHabitsPage = () => {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState<'active' | 'paused' | 'archived'>('active');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data: habits, isLoading } = useHabits(statusFilter);
    const deleteHabit = useDeleteHabit();
    const updateHabit = useUpdateHabit();

    const handleArchive = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        updateHabit.mutate({ id, status: 'archived' });
    };

    const handleRestore = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        updateHabit.mutate({ id, status: 'active' });
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure? This will delete all history.')) {
            deleteHabit.mutate(id);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <CreateHabitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All Habits</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and view your habit history</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-indigo-600 text-white px-5 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all"
                >
                    <Plus className="w-5 h-5" />
                    <span>New Habit</span>
                </button>
            </motion.header>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['active', 'paused', 'archived'] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={cn(
                            "px-4 py-2 rounded-xl font-medium capitalize transition-colors whitespace-nowrap",
                            statusFilter === s
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        )}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : habits?.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center"
                >
                    <p className="text-slate-500 dark:text-slate-400">No {statusFilter} habits found.</p>
                    {statusFilter === 'active' && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                            + Create your first habit
                        </button>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                >
                    {habits?.map((habit, i) => (
                        <motion.div
                            key={habit.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => navigate(`/habits/${habit.id}`)}
                            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                                style={{ backgroundColor: `${habit.color}20`, color: habit.color }}
                            >
                                {habit.icon || habit.title.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-slate-900 dark:text-white truncate">{habit.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Flame className="w-4 h-4 text-orange-500" />
                                        {habit.currentStreak}
                                    </span>
                                    <span>Best: {habit.longestStreak}</span>
                                    <span className="capitalize">{habit.frequency}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {statusFilter === 'archived' ? (
                                    <button
                                        onClick={(e) => handleRestore(e, habit.id)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-teal-600"
                                        title="Restore"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => handleArchive(e, habit.id)}
                                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-amber-600"
                                        title="Archive"
                                    >
                                        <Archive className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => handleDelete(e, habit.id)}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-600"
                                    title="Delete"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
};
