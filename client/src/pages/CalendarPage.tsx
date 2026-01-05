import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { useCalendarEvents, useHabits, useCreateEvent } from '../lib/queries';
import { motion } from 'framer-motion';

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
                <div className="bg-white rounded-2xl border border-slate-100 p-6">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">
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

                            return (
                                <motion.button
                                    key={day.toISOString()}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.01 }}
                                    onClick={() => handleDayClick(day)}
                                    className={`aspect-square p-2 rounded-xl border transition-all hover:border-indigo-300 hover:bg-indigo-50/50 ${isToday(day)
                                            ? 'bg-indigo-50 border-indigo-200'
                                            : 'border-slate-100'
                                        }`}
                                >
                                    <div className={`text-sm font-medium ${isToday(day) ? 'text-indigo-600' : 'text-slate-700'}`}>
                                        {format(day, 'd')}
                                    </div>

                                    {hasActivity && (
                                        <div className="mt-1 flex flex-wrap gap-0.5">
                                            {completedHabits.slice(0, 3).map(h => (
                                                <div
                                                    key={h.id}
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: h.color }}
                                                    title={h.title}
                                                />
                                            ))}
                                            {dayEvents.slice(0, 2).map(e => (
                                                <div
                                                    key={e.id}
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: e.color }}
                                                    title={e.title}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-sm text-slate-500">
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500" /> Completed Habits
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" /> Events
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
