import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BadgeUnlockAnimationProps {
    badge: {
        name: string;
        description: string;
        icon: string;
        color: string;
        tier: string;
        xpReward: number;
    };
    onClose: () => void;
}

const TIER_COLORS = {
    bronze: 'from-orange-400 to-amber-600',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-amber-300 to-yellow-600',
    platinum: 'from-cyan-400 to-blue-600',
};

const TIER_GLOW = {
    bronze: 'shadow-orange-500/50',
    silver: 'shadow-slate-400/50',
    gold: 'shadow-yellow-500/50',
    platinum: 'shadow-cyan-400/50',
};

export const BadgeUnlockAnimation = ({ badge, onClose }: BadgeUnlockAnimationProps) => {
    const [stage, setStage] = useState<'reveal' | 'details'>('reveal');

    useEffect(() => {
        const timer = setTimeout(() => setStage('details'), 1500);
        return () => clearTimeout(timer);
    }, []);

    const tierGradient = TIER_COLORS[badge.tier as keyof typeof TIER_COLORS] || TIER_COLORS.bronze;
    const tierGlow = TIER_GLOW[badge.tier as keyof typeof TIER_GLOW] || TIER_GLOW.bronze;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center"
            onClick={onClose}
        >
            {/* Particle effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{
                            x: '50vw',
                            y: '50vh',
                            scale: 0,
                            opacity: 1
                        }}
                        animate={{
                            x: `${Math.random() * 100}vw`,
                            y: `${Math.random() * 100}vh`,
                            scale: Math.random() * 0.5 + 0.5,
                            opacity: 0
                        }}
                        transition={{
                            duration: 2,
                            delay: i * 0.05,
                            ease: 'easeOut'
                        }}
                        className="absolute"
                    >
                        <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                    </motion.div>
                ))}
            </div>

            <motion.div
                onClick={(e) => e.stopPropagation()}
                className="relative"
            >
                <AnimatePresence mode="wait">
                    {stage === 'reveal' ? (
                        <motion.div
                            key="reveal"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: 'spring', damping: 12 }}
                            className="relative"
                        >
                            {/* Glow */}
                            <motion.div
                                className={cn(
                                    "absolute inset-0 rounded-full blur-3xl opacity-70",
                                    `bg-gradient-to-br ${tierGradient}`
                                )}
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.5, 0.8, 0.5]
                                }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                            />

                            <div className={cn(
                                "relative w-40 h-40 rounded-full flex items-center justify-center shadow-2xl",
                                `bg-gradient-to-br ${tierGradient}`,
                                tierGlow
                            )}>
                                <span className="text-7xl">{badge.icon}</span>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm text-center shadow-2xl"
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>

                            {/* Badge icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', delay: 0.1 }}
                                className={cn(
                                    "w-24 h-24 mx-auto rounded-2xl flex items-center justify-center shadow-lg mb-4",
                                    `bg-gradient-to-br ${tierGradient}`
                                )}
                            >
                                <span className="text-5xl">{badge.icon}</span>
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
                            >
                                {badge.name}
                            </motion.h2>

                            {/* Tier */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center justify-center gap-1 mb-3"
                            >
                                {[...Array(
                                    badge.tier === 'platinum' ? 4 :
                                        badge.tier === 'gold' ? 3 :
                                            badge.tier === 'silver' ? 2 : 1
                                )].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                                <span className="ml-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    {badge.tier}
                                </span>
                            </motion.div>

                            {/* Description */}
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-slate-500 dark:text-slate-400 mb-6"
                            >
                                {badge.description}
                            </motion.p>

                            {/* XP Reward */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-full font-bold"
                            >
                                <Zap className="w-5 h-5" />
                                +{badge.xpReward} XP
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
};

export default BadgeUnlockAnimation;
