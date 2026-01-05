import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, isEqual, startOfDay } from 'date-fns';
import {
    ArrowLeft, Edit2, Trash2, Flame,
    Target, Loader2, TrendingUp
} from 'lucide-react';
import { useHabit, useUpdateHabit, useDeleteHabit } from '../lib/queries';
import { cn } from '../lib/utils';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
    '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];

export const HabitDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: habit, isLoading } = useHabit(id!);
    const updateHabit = useUpdateHabit();
    const deleteHabit = useDeleteHabit();

    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Edit form state
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editColor, setEditColor] = useState('');
    const [editDays, setEditDays] = useState<number[]>([]);

    const startEdit = () => {
        if (habit) {
            setEditTitle(habit.title);
            setEditDescription(habit.description || '');
            setEditColor(habit.color);
            setEditDays(habit.frequencyDays
                ? habit.frequencyDays.split(',').map(Number)
                : [0, 1, 2, 3, 4, 5, 6]);
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        if (!habit) return;

        try {
            await updateHabit.mutateAsync({
                id: habit.id,
                title: editTitle,
                description: editDescription || undefined,
                color: editColor,
                frequency: editDays.length === 7 ? 'daily' : 'custom',
                frequencyDays: editDays.length === 7 ? undefined : editDays.join(','),
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update habit:', error);
        }
    };

    const handleDelete = async () => {
        if (!habit) return;

        try {
            await deleteHabit.mutateAsync(habit.id);
            navigate('/habits');
        } catch (error) {
            console.error('Failed to delete habit:', error);
        }
    };

    const toggleDay = (dayId: number) => {
        if (editDays.includes(dayId)) {
            if (editDays.length > 1) {
                setEditDays(editDays.filter(d => d !== dayId));
            }
        } else {
            setEditDays([...editDays, dayId].sort());
        }
    };

    // Generate last 30 days for activity view
    const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), 29 - i));

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!habit) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                <p className="text-lg">Habit not found</p>
                <button
                    onClick={() => navigate('/habits')}
                    className="mt-4 text-indigo-600 hover:underline"
                >
                    Back to Habits
                </button>
            </div>
        );
    }

    const scheduledDays = habit.frequencyDays
        ? habit.frequencyDays.split(',').map(Number)
        : [0, 1, 2, 3, 4, 5, 6];

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex-1" />
                <button
                    onClick={startEdit}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                    <Edit2 className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                    <Trash2 className="w-5 h-5 text-red-500" />
                </button>
            </motion.div>

            {/* Habit Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700"
            >
                <div className="flex items-start gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl"
                        style={{ backgroundColor: habit.color }}
                    >
                        {habit.icon || habit.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{habit.title}</h1>
                        {habit.description && (
                            <p className="text-slate-500 dark:text-slate-400 mt-1">{habit.description}</p>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                            <Flame className="w-5 h-5" />
                            <span className="text-2xl font-bold">{habit.currentStreak}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Current Streak</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-2xl font-bold">{habit.longestStreak}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Best Streak</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="flex items-center justify-center gap-1 text-indigo-500 mb-1">
                            <Target className="w-5 h-5" />
                            <span className="text-2xl font-bold">{habit.goal}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Daily Goal</p>
                    </div>
                </div>

                {/* Schedule */}
                <div className="mt-6">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Schedule</h3>
                    <div className="flex gap-2 justify-between">
                        {DAYS_OF_WEEK.map((day, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                                    scheduledDays.includes(index)
                                        ? "bg-indigo-500 text-white"
                                        : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                )}
                            >
                                {day}
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Activity */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700"
            >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Last 30 Days</h3>
                <div className="flex flex-wrap gap-1.5">
                    {last30Days.map((date, index) => {
                        const isCompleted = habit.logs?.some(
                            (log: any) => isEqual(startOfDay(new Date(log.date)), startOfDay(date))
                        );
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                                    isCompleted
                                        ? "text-white"
                                        : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                )}
                                style={isCompleted ? { backgroundColor: habit.color } : undefined}
                                title={format(date, 'MMM d, yyyy')}
                            >
                                {format(date, 'd')}
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsEditing(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                            >
                                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Habit</h2>
                                </div>

                                <div className="p-6 space-y-4 overflow-y-auto">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Days</label>
                                        <div className="flex gap-2 justify-between">
                                            {DAYS_OF_WEEK.map((day, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => toggleDay(index)}
                                                    className={cn(
                                                        "w-10 h-10 rounded-full font-medium text-sm transition-all",
                                                        editDays.includes(index)
                                                            ? "bg-indigo-500 text-white"
                                                            : "bg-slate-100 dark:bg-slate-700 text-slate-500"
                                                    )}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Color</label>
                                        <div className="flex flex-wrap gap-2">
                                            {COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setEditColor(c)}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full",
                                                        editColor === c && "ring-2 ring-offset-2 ring-slate-900 dark:ring-white"
                                                    )}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={updateHabit.isPending}
                                        className="flex-1 px-4 py-3 rounded-xl bg-indigo-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {updateHabit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteConfirm(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6"
                            >
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Habit?</h3>
                                <p className="text-slate-500 dark:text-slate-400 mb-6">
                                    This will permanently delete "{habit.title}" and all its history.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleteHabit.isPending}
                                        className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium disabled:opacity-50"
                                    >
                                        {deleteHabit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
