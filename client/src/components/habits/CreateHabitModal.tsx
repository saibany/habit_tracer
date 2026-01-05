import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Calendar, Clock, Palette } from 'lucide-react';
import { useCreateHabit } from '../../lib/queries';
import { cn } from '../../lib/utils';

interface CreateHabitModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DAYS_OF_WEEK = [
    { id: 0, short: 'S', full: 'Sun' },
    { id: 1, short: 'M', full: 'Mon' },
    { id: 2, short: 'T', full: 'Tue' },
    { id: 3, short: 'W', full: 'Wed' },
    { id: 4, short: 'T', full: 'Thu' },
    { id: 5, short: 'F', full: 'Fri' },
    { id: 6, short: 'S', full: 'Sat' },
];

const COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#14B8A6', '#06B6D4',
    '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
];

const TIME_OF_DAY = [
    { id: 'morning', label: 'Morning', icon: '🌅' },
    { id: 'afternoon', label: 'Afternoon', icon: '☀️' },
    { id: 'evening', label: 'Evening', icon: '🌙' },
    { id: 'anytime', label: 'Anytime', icon: '⏰' },
];

export const CreateHabitModal = ({ isOpen, onClose }: CreateHabitModalProps) => {
    const createHabit = useCreateHabit();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#6366F1');
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
    const [timeOfDay, setTimeOfDay] = useState<string>('anytime');
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [error, setError] = useState('');

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setColor('#6366F1');
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        setTimeOfDay('anytime');
        setReminderEnabled(false);
        setReminderTime('09:00');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const toggleDay = (dayId: number) => {
        if (selectedDays.includes(dayId)) {
            if (selectedDays.length > 1) {
                setSelectedDays(selectedDays.filter(d => d !== dayId));
            }
        } else {
            setSelectedDays([...selectedDays, dayId].sort());
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter a habit name');
            return;
        }

        try {
            await createHabit.mutateAsync({
                title: title.trim(),
                description: description.trim() || undefined,
                color,
                frequency: selectedDays.length === 7 ? 'daily' : 'custom',
                frequencyDays: selectedDays.length === 7 ? undefined : selectedDays.join(','),
                timeOfDay,
            });
            handleClose();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to create habit');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Habit</h2>
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Habit Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Morning Exercise, Read 30 mins"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all text-slate-900 dark:text-white"
                                        autoFocus
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Why is this habit important to you?"
                                        rows={2}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800 outline-none transition-all text-slate-900 dark:text-white resize-none"
                                    />
                                </div>

                                {/* Days of Week */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                        <Calendar className="w-4 h-4" />
                                        Repeat on
                                    </label>
                                    <div className="flex gap-2 justify-between">
                                        {DAYS_OF_WEEK.map((day) => (
                                            <button
                                                key={day.id}
                                                type="button"
                                                onClick={() => toggleDay(day.id)}
                                                className={cn(
                                                    "w-10 h-10 rounded-full font-medium text-sm transition-all",
                                                    selectedDays.includes(day.id)
                                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                                        : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                                                )}
                                            >
                                                {day.short}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                        {selectedDays.length === 7
                                            ? 'Every day'
                                            : `${selectedDays.length} days per week`}
                                    </p>
                                </div>

                                {/* Time of Day */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                        <Clock className="w-4 h-4" />
                                        Best time
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {TIME_OF_DAY.map((time) => (
                                            <button
                                                key={time.id}
                                                type="button"
                                                onClick={() => setTimeOfDay(time.id)}
                                                className={cn(
                                                    "flex flex-col items-center gap-1 p-3 rounded-xl text-sm transition-all",
                                                    timeOfDay === time.id
                                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400"
                                                        : "bg-slate-50 dark:bg-slate-700 border-2 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600"
                                                )}
                                            >
                                                <span className="text-lg">{time.icon}</span>
                                                <span className="text-xs font-medium">{time.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                        <Palette className="w-4 h-4" />
                                        Color
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setColor(c)}
                                                className={cn(
                                                    "w-8 h-8 rounded-full transition-all",
                                                    color === c
                                                        ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-800 scale-110"
                                                        : "hover:scale-110"
                                                )}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Reminder */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            Daily Reminder
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setReminderEnabled(!reminderEnabled)}
                                            className={cn(
                                                "w-11 h-6 rounded-full transition-colors",
                                                reminderEnabled
                                                    ? "bg-indigo-500"
                                                    : "bg-slate-300 dark:bg-slate-600"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-5 h-5 bg-white rounded-full shadow transition-transform",
                                                reminderEnabled ? "translate-x-5" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </label>
                                    {reminderEnabled && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="mt-3"
                                        >
                                            <input
                                                type="time"
                                                value={reminderTime}
                                                onChange={(e) => setReminderTime(e.target.value)}
                                                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                            />
                                        </motion.div>
                                    )}
                                </div>
                            </form>

                            {/* Footer */}
                            <div className="flex gap-3 p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={createHabit.isPending || !title.trim()}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-medium hover:from-teal-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {createHabit.isPending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        'Create Habit'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
