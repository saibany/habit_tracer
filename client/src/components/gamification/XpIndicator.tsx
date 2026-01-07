import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useXpBreakdown } from '../../lib/gamificationQueries';
import { cn } from '../../lib/utils';

interface XpIndicatorProps {
    onClick: () => void;
    collapsed?: boolean;
}

export const XpIndicator = ({ onClick, collapsed = false }: XpIndicatorProps) => {
    const { data: xp } = useXpBreakdown();

    if (!xp) return null;

    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "w-full rounded-xl transition-all group relative",
                "bg-gradient-to-r from-indigo-600 to-purple-600",
                "hover:from-indigo-500 hover:to-purple-500",
                "shadow-lg hover:shadow-indigo-500/25",
                collapsed ? "p-2" : "p-3"
            )}
        >
            <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                {/* Level Badge */}
                <div className={cn(
                    "flex items-center justify-center rounded-lg bg-white/20",
                    collapsed ? "w-8 h-8" : "w-10 h-10"
                )}>
                    <span className={cn(
                        "font-bold text-white",
                        collapsed ? "text-sm" : "text-lg"
                    )}>
                        {xp.level}
                    </span>
                </div>

                {/* XP Info - only when not collapsed */}
                {!collapsed && (
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                            <span className="text-sm font-semibold text-white">
                                {xp.totalXp.toLocaleString()} XP
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-1.5 h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${xp.levelProgress.progressPercent}%` }}
                                transition={{ duration: 0.8 }}
                            />
                        </div>

                        <div className="flex justify-between mt-0.5">
                            <span className="text-xs text-white/60">
                                Level {xp.level}
                            </span>
                            <span className="text-xs text-white/60">
                                {xp.levelProgress.xpInCurrentLevel}/{xp.levelProgress.xpNeededForNextLevel}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Today's XP badge */}
            {!collapsed && xp.xpToday > 0 && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg"
                >
                    +{xp.xpToday}
                </motion.div>
            )}
        </motion.button>
    );
};

export default XpIndicator;
