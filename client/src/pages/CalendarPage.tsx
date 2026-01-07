import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useCalendarEvents, useHabits, useCreateEvent } from '../lib/queries';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export const CalendarPage = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const { data: events, isLoading: eventsLoading } = useCalendarEvents(
        monthStart.toISOString(),
        monthEnd.toISOString()
    );
    const { data: habits } = useHabits('active');

    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDayOfWeek = monthStart.getDay();

    const getEventsForDay = (date: Date) => events?.filter(e => isSameDay(new Date(e.startDate), date)) || [];

    const getHabitLogsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return habits?.filter(h =>
            h.logs.some(l => format(new Date(l.date), 'yyyy-MM-dd') === dateStr && l.completed)
        ) || [];
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setShowEventModal(true);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Calendar</h1>
                    <p className="text-slate-500 mt-1">View your habits and events</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <h2 className="text-xl font-semibold text-slate-900 min-w-[160px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-slate-100 rounded-lg"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </header>

            {eventsLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : (
                <div className="glass-panel p-6 rounded-2xl">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {/* Empty cells for start of month */}
                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square" />
                        ))}

                        {/* Days */}
                        {days.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            const completedHabits = getHabitLogsForDay(day);
                            const hasActivity = dayEvents.length > 0 || completedHabits.length > 0;
                            const isTodayDate = isToday(day);

                            return (
                                <motion.button
                                    key={day.toISOString()}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                    onClick={() => handleDayClick(day)}
                                    className={cn(
                                        "aspect-square p-2 rounded-xl border transition-all relative overflow-hidden group",
                                        isTodayDate
                                            ? "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/50"
                                            : "border-slate-100 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "text-sm font-medium relative z-10",
                                        isTodayDate ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {format(day, 'd')}
                                    </div>

                                    {hasActivity && (
                                        <div className="mt-1 flex flex-wrap gap-0.5 relative z-10">
                                            {completedHabits.slice(0, 3).map(h => (
                                                <div
                                                    key={h.id}
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ backgroundColor: h.color }}
                                                    title={h.title}
                                                />
                                            ))}
                                            {dayEvents.slice(0, 2).map(e => (
                                                <div
                                                    key={e.id}
                                                    className="w-1.5 h-1.5 rounded-full ring-1 ring-white/20"
                                                    style={{ backgroundColor: e.color }}
                                                    title={e.title}
                                                />
                                            ))}
                                            {(completedHabits.length + dayEvents.length) > 5 && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            )}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm" /> Completed Habits
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" /> Events
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-md bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/50" /> Today
                </span>
            </div>

            {/* Event Modal (simplified) */}
            {showEventModal && selectedDate && (
                <EventModal
                    date={selectedDate}
                    onClose={() => setShowEventModal(false)}
                />
            )}
        </div>
    );
};

const EventModal = ({ date, onClose }: { date: Date; onClose: () => void }) => {
    const [title, setTitle] = useState('');
    const createEvent = useCreateEvent();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createEvent.mutate(
            { title, startDate: date.toISOString(), allDay: true },
            { onSuccess: () => { onClose(); setTitle(''); } }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                    Add Event - {format(date, 'MMM d, yyyy')}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Event title..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none"
                        required
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-medium">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createEvent.isPending}
                            className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-50"
                        >
                            {createEvent.isPending ? 'Adding...' : 'Add Event'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
