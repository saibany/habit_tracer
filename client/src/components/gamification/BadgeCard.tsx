import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Badge } from '../../lib/queries';
import { Star, Lock, Zap } from 'lucide-react';

export const TIER_COLORS: Record<string, string> = {
    bronze: 'from-orange-400 to-amber-600',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-amber-300 to-yellow-600',
    platinum: 'from-cyan-400 to-blue-600',
};

interface BadgeCardProps {
    badge: Badge;
    onClick: () => void;
}

export const BadgeCard = ({ badge, onClick }: BadgeCardProps) => {
    if (!badge) return null;

    const isEarned = badge.state === 'earned';
    const progress = badge.progress || 0;
    const threshold = badge.threshold || 1;
    const progressPercent = Math.min(100, (progress / threshold) * 100);

    const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
    const tierName = badge.tier || 'bronze';
    const maxStars = tierName === 'platinum' ? 4 : tierName === 'gold' ? 3 : tierName === 'silver' ? 2 : 1;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "relative group p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                isEarned
                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-70 hover:opacity-100"
            )}
        >
            {/* Glossy Effect for Earned Badges */}
            {isEarned && (
                <div className={cn(
                    "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-10 rounded-bl-full transition-opacity group-hover:opacity-20",
                    tierColor
                )} />
            )}

            <div className="flex items-start justify-between mb-3 relative z-10">
                <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm",
                    isEarned
                        ? `bg-gradient-to-br ${tierColor} text-white`
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                )}>
                    {badge.icon || '🏅'}
                </div>
                {isEarned ? (
                    <div className="flex flex-col items-end">
                        <span className={cn("text-xs font-bold uppercase tracking-wider mb-1",
                            tierColor.split(' ')[1].replace('to-', 'text-')
                        )}>
                            {tierName}
                        </span>
                        <div className="flex gap-1">
                            {[...Array(maxStars)].map((_, i) => (
                                <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                )}
            </div>

            <div className="relative z-10">
                <h4 className={cn("font-bold text-lg mb-1", isEarned ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                    {badge.name}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 h-10 line-clamp-2 leading-tight mb-4">
                    {badge.description}
                </p>

                {isEarned ? (
                    <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                        <span>Earned {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : ''}</span>
                        <span className="flex items-center gap-1 text-amber-500">
                            <Zap className="w-3 h-3" /> +{badge.xpReward} XP
                        </span>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Progress</span>
                            <span>{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                className={cn("h-full bg-gradient-to-r", tierColor)}
                            />
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-1">
                            {badge.progress} / {threshold} to unlock
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
