import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Calendar, BarChart2 } from 'lucide-react';

import { useCreateChallenge } from '../../lib/gamificationQueries';
import { toast } from 'react-hot-toast';

interface CreateChallengeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateChallengeModal = ({ isOpen, onClose }: CreateChallengeModalProps) => {
    const createChallenge = useCreateChallenge();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        targetType: 'daily_completions',
        targetValue: 1,
        difficulty: 'medium',
        startDate: new Date().toISOString().slice(0, 10),
        durationDays: 7
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const endDate = new Date(formData.startDate);
            endDate.setDate(endDate.getDate() + formData.durationDays);

            await createChallenge.mutateAsync({
                title: formData.title,
                description: formData.description,
                targetType: formData.targetType,
                targetValue: Number(formData.targetValue),
                difficulty: formData.difficulty as any,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: endDate.toISOString(),
                xpReward: formData.difficulty === 'easy' ? 25 : formData.difficulty === 'medium' ? 50 : formData.difficulty === 'hard' ? 100 : 200
            });

            toast.success('Challenge created successfully!');
            onClose();
            // Reset form
            setFormData({
                title: '',
                description: '',
                targetType: 'daily_completions',
                targetValue: 1,
                difficulty: 'medium',
                startDate: new Date().toISOString().slice(0, 10),
                durationDays: 7
            });
        } catch (error) {
            toast.error('Failed to create challenge');
            console.error(error);
        }
    };

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
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]"
                >
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Challenge</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Challenge Title</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="e.g., 30 Days of Coding"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all h-24 resize-none"
                                placeholder="What's this challenge about?"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Target className="w-4 h-4 text-slate-400" />
                                    Goal Type
                                </label>
                                <select
                                    value={formData.targetType}
                                    onChange={e => setFormData({ ...formData, targetType: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="daily_completions">Daily Habits</option>
                                    <option value="streak_days">Maintain Streak</option>
                                    <option value="total_completions">Total Reps</option>
                                    <option value="xp_gain">Earn XP</option>
                                </select>
                            </div>

                            {/* Target */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Target Value</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={formData.targetValue}
                                    onChange={e => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Difficulty */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <BarChart2 className="w-4 h-4 text-slate-400" />
                                    Difficulty
                                </label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                    <option value="extreme">Extreme</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Duration (Days)</label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                required
                                value={formData.durationDays}
                                onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={createChallenge.isPending}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createChallenge.isPending ? 'Creating...' : 'Create Challenge'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
