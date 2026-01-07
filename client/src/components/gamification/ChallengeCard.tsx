import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Challenge } from '../../lib/queries';
import { Clock, Trophy, Zap, CheckCircle2, LogOut } from 'lucide-react';

const DIFFICULTY_COLORS = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    extreme: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface ChallengeCardProps {
    challenge: Challenge;
    onJoin: () => void;
    onLeave: () => void;
    onViewLeaderboard: () => void;
    isSelected: boolean;
}

export const ChallengeCard = ({
    challenge,
    onJoin,
    onLeave,
    onViewLeaderboard,
    isSelected
}: ChallengeCardProps) => {
    // Defensive coding: handle potential missing values
    if (!challenge) return null;

    const progress = challenge.progress || 0;
    const targetValue = challenge.targetValue || 1;
    const progressPercent = Math.min(100, Math.round((progress / targetValue) * 100));

    const isCompleted = challenge.participantState === 'completed';
    const isJoined = challenge.joined;

    const difficultyColor = DIFFICULTY_COLORS[challenge.difficulty as keyof typeof DIFFICULTY_COLORS] || DIFFICULTY_COLORS.easy;
    const targetTypeLabel = challenge.targetType ? challenge.targetType.replace(/_/g, ' ') : 'goal';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative p-6 rounded-3xl border transition-all overflow-hidden",
                isSelected
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700 shadow-lg ring-2 ring-indigo-500/20"
                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md"
            )}
        >
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-bl-full -z-0" />

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide", difficultyColor)}>
                                {challenge.difficulty || 'Normal'}
                            </span>
                            {challenge.timeRemaining !== undefined && challenge.timeRemaining !== null && (
                                <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {Math.ceil(challenge.timeRemaining / (1000 * 60 * 60 * 24))} days left
                                </span>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{challenge.title}</h3>
                    </div>
                    {isCompleted && (
                        <div className="bg-green-100 text-green-700 p-2 rounded-full">
                            <Trophy className="w-5 h-5" />
                        </div>
                    )}
                </div>

                <p className="text-slate-500 dark:text-slate-400 mb-6 flex-grow">{challenge.description}</p>

                <div className="space-y-4">
                    {isJoined ? (
                        <div className="space-y-2 bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between text-sm font-medium mb-1">
                                <span className="text-slate-700 dark:text-slate-300">Your Progress</span>
                                <span className="text-indigo-600 dark:text-indigo-400">{progressPercent}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    className={cn(
                                        "h-full bg-gradient-to-r",
                                        isCompleted ? "from-green-400 to-emerald-600" : "from-indigo-500 to-purple-600"
                                    )}
                                />
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
                                <span>{progress} / {targetValue} {targetTypeLabel}</span>
                                {isCompleted ? (
                                    <span className="text-green-600 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Completed
                                    </span>
                                ) : (
                                    <span>Keep going!</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-sm text-slate-500">Reward</span>
                            <span className="flex items-center gap-1 font-bold text-amber-500">
                                <Zap className="w-4 h-4" /> {challenge.xpReward} XP
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                        {isJoined ? (
                            <>
                                <button
                                    onClick={onViewLeaderboard}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                >
                                    {isSelected ? 'Hide Leaderboard' : 'View Leaderboard'}
                                </button>
                                <button
                                    onClick={onLeave}
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Leave Challenge"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onJoin}
                                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all active:scale-95"
                            >
                                Join Challenge
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
