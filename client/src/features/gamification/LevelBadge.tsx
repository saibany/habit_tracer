import { motion } from 'framer-motion';

interface LevelBadgeProps {
    level: number;
    xp: number;
    nextLevelXp: number;
}

export const LevelBadge = ({ level, xp, nextLevelXp }: LevelBadgeProps) => {
    // Calculate progress within current level
    const currentLevelXp = (level - 1) * 100;
    const xpInLevel = xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progress = Math.min((xpInLevel / xpNeeded) * 100, 100);

    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
                {/* SVG Ring */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="24" cy="24" r={radius}
                        className="stroke-slate-100"
                        strokeWidth="4"
                        fill="none"
                    />
                    <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        cx="24" cy="24" r={radius}
                        className="stroke-indigo-500"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-600">
                    {level}
                </div>
            </div>
            <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Level {level}</p>
                <p className="text-sm font-medium text-slate-700">{xp} XP</p>
            </div>
        </div>
    );
};
