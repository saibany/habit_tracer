import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, ChevronUp } from 'lucide-react';

interface LevelUpToastProps {
    oldLevel: number;
    newLevel: number;
    onComplete?: () => void;
}

export const LevelUpToast = ({ oldLevel: _oldLevel, newLevel, onComplete }: LevelUpToastProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
        }, 5000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.5 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -50, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
                >
                    <div className="relative">
                        {/* Animated glow */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-2xl blur-xl opacity-50"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.5, 0.7, 0.5]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />

                        {/* Main toast */}
                        <div className="relative bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
                            {/* Level badge */}
                            <motion.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                                className="relative"
                            >
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.4, type: 'spring' }}
                                        className="text-3xl font-black"
                                    >
                                        {newLevel}
                                    </motion.span>
                                </div>

                                {/* Stars around badge */}
                                {[...Array(6)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{
                                            scale: [0, 1.2, 0],
                                            opacity: [0, 1, 0]
                                        }}
                                        transition={{
                                            delay: 0.3 + i * 0.1,
                                            duration: 0.8
                                        }}
                                        className="absolute"
                                        style={{
                                            top: `${50 + 40 * Math.sin(i * Math.PI / 3)}%`,
                                            left: `${50 + 40 * Math.cos(i * Math.PI / 3)}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        <Star className="w-4 h-4 fill-white text-white" />
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Text content */}
                            <div>
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex items-center gap-2"
                                >
                                    <ChevronUp className="w-5 h-5" />
                                    <span className="uppercase text-sm font-bold tracking-wider opacity-90">
                                        Level Up!
                                    </span>
                                </motion.div>
                                <motion.p
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-xl font-bold"
                                >
                                    You reached Level {newLevel}!
                                </motion.p>
                            </div>

                            {/* XP icon */}
                            <motion.div
                                animate={{
                                    rotate: [0, 10, -10, 0],
                                }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                            >
                                <Zap className="w-8 h-8 fill-white" />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LevelUpToast;
