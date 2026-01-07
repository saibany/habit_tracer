import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Calendar, Lock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import type { Badge } from '../../lib/queries';

interface BadgeDetailModalProps {
    badge: Badge | null;
    onClose: () => void;
}

const TIER_COLORS = {
    bronze: 'from-orange-400 to-amber-600',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-amber-300 to-yellow-600',
    platinum: 'from-cyan-400 to-blue-600',
};

const TIER_BG = {
    bronze: 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400',
    silver: 'bg-slate-50 dark:bg-slate-900/10 text-slate-700 dark:text-slate-400',
    gold: 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400',
    platinum: 'bg-cyan-50 dark:bg-cyan-900/10 text-cyan-700 dark:text-cyan-400',
};

export const BadgeDetailModal = ({ badge, onClose }: BadgeDetailModalProps) => {
    if (!badge) return null;

    const isEarned = badge.state === 'earned';
    const progressPercent = Math.min(100, Math.round((badge.progress / badge.threshold) * 100));
    const tierGradient = TIER_COLORS[badge.tier] || TIER_COLORS.bronze;
    const tierStyle = TIER_BG[badge.tier] || TIER_BG.bronze;

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
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative"
                >
                    {/* Header Background */}
                    <div className={cn(
                        "h-32 w-full absolute top-0 left-0 bg-gradient-to-br opacity-10",
                        tierGradient
                    )} />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-colors z-10"
                    >
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>

                    <div className="relative pt-12 px-8 pb-8 flex flex-col items-center text-center">
                        {/* Icon */}
                        <motion.div
                            initial={{ scale: 0.5, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={cn(
                                "w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-xl mb-6 relative",
                                `bg-gradient-to-br ${tierGradient}`
                            )}
                        >
                            {badge.icon}
                            {isEarned && (
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white dark:border-slate-800">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                            )}
                        </motion.div>

                        {/* Name & Rarity */}
                        <div className="mb-2">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {badge.name}
                            </h2>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className={cn(
                                    "text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                                    tierStyle
                                )}>
                                    {badge.tier}
                                </span>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    {badge.rarity}
                                </span>
                            </div>
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            {badge.description}
                        </p>

                        {/* Progress Section */}
                        <div className="w-full bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {isEarned ? 'Completed' : 'Progress'}
                                </span>
                                <span className="text-slate-500">
                                    {badge.progress} / {badge.threshold}
                                </span>
                            </div>
                            <div className="h-2.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={cn(
                                        "h-full rounded-full bg-gradient-to-r",
                                        tierGradient
                                    )}
                                />
                            </div>
                            {!isEarned && (
                                <p className="text-xs text-slate-400 mt-2">
                                    {badge.threshold - badge.progress} more to unlock
                                </p>
                            )}
                        </div>

                        {/* Stats / Rewards */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl flex flex-col items-center">
                                <Zap className="w-5 h-5 text-amber-500 mb-1" />
                                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">+{badge.xpReward}</span>
                                <span className="text-xs text-amber-600/70 dark:text-amber-500/70 font-medium">XP Reward</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl flex flex-col items-center">
                                {isEarned ? (
                                    <>
                                        <Calendar className="w-5 h-5 text-slate-400 mb-1" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
                                            {badge.earnedAt ? format(new Date(badge.earnedAt), 'MMM d, yyyy') : 'Earned'}
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">Unlocked On</span>
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5 text-slate-400 mb-1" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
                                            Locked
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium">Status</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
