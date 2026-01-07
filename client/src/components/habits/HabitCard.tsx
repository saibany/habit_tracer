import { motion } from 'framer-motion';
import { Check, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HabitCardProps {
    title: string;
    description?: string;
    streak: number;
    completed: boolean;
    color: string;
    icon?: string;
    onToggle: () => void;
}

export const HabitCard = ({ title, streak, completed, color, icon, onToggle }: HabitCardProps) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group relative p-5 rounded-2xl transition-all duration-300",
                completed
                    ? "bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 opacity-80"
                    : "glass-card border-l-4"
            )}
            style={{ borderLeftColor: completed ? undefined : color }}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left Side: Icon & Text */}
                <div className="flex items-center gap-4 flex-1">
                    <div
                        className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-transform duration-300 group-hover:scale-105",
                            completed ? "opacity-50 grayscale bg-slate-100 dark:bg-white/5" : "bg-white dark:bg-white/10"
                        )}
                        style={{ color: completed ? undefined : color }}
                    >
                        {icon || '🎯'}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className={cn(
                            "font-semibold text-lg truncate transition-colors",
                            completed ? "text-slate-500 line-through decoration-2 decoration-slate-300 dark:decoration-slate-700" : "text-slate-900 dark:text-slate-100"
                        )}>
                            {title}
                        </h3>
                        {streak > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-medium mt-1 text-orange-500 dark:text-orange-400">
                                <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                                <span>{streak} day streak</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Action Button */}
                <button
                    onClick={onToggle}
                    className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                        completed
                            ? "bg-teal-500 text-white shadow-teal-500/30 scale-95"
                            : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:bg-teal-50 dark:hover:bg-teal-500/20 hover:text-teal-500 dark:hover:text-teal-400 hover:scale-110"
                    )}
                >
                    <Check className={cn("w-6 h-6 transition-all", completed ? "stroke-[3px]" : "stroke-2")} />
                </button>
            </div>
        </motion.div>
    );
};
