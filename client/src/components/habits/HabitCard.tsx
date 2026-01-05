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
                "group relative bg-white p-5 rounded-2xl shadow-sm border border-slate-100/50 hover:shadow-md transition-all duration-300",
                completed && "bg-slate-50/50 border-slate-100"
            )}
        >
            <div className="flex items-center justify-between gap-4">
                {/* Left Side: Icon & Text */}
                <div className="flex items-center gap-4 flex-1">
                    <div
                        className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm transition-transform duration-300 group-hover:scale-105",
                            completed ? "opacity-50 grayscale" : "opacity-100"
                        )}
                        style={{ backgroundColor: `${color}15`, color: color }}
                    >
                        {icon || '🎯'}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className={cn(
                            "font-semibold text-lg text-slate-900 truncate transition-colors",
                            completed && "text-slate-500 line-through"
                        )}>
                            {title}
                        </h3>
                        {streak > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-orange-500 font-medium mt-1">
                                <Flame className="w-3.5 h-3.5 fill-orange-500 animate-pulse" />
                                <span>{streak} day streak</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Action Button */}
                <button
                    onClick={onToggle}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
                        completed
                            ? "bg-teal-500 text-white translate-y-[1px] shadow-inner"
                            : "bg-slate-100 hover:bg-teal-50 text-slate-400 hover:text-teal-500 hover:scale-110"
                    )}
                >
                    <Check className={cn("w-5 h-5 transition-all text-current", completed ? "stroke-[3px]" : "")} />
                </button>
            </div>
        </motion.div>
    );
};
