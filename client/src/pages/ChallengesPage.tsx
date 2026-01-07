import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Users, Target, Calendar, Award,
    Flame, Zap, Medal, Clock, CheckCircle2, X, PlusCircle, Loader2
} from 'lucide-react';
import { useBadges, useJoinChallenge, useLeaveChallenge, useChallengeLeaderboard, Badge } from '../lib/queries';
import { useChallenges, useChallengeHistory } from '../lib/gamificationQueries';
import { BadgeDetailModal, BadgeCard, ChallengeCard, CreateChallengeModal } from '../components/gamification';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const ChallengesPage = () => {
    const { data: badges } = useBadges();
    const { data: challenges } = useChallenges();
    const { data: historyData } = useChallengeHistory();
    const joinChallenge = useJoinChallenge();
    const leaveChallenge = useLeaveChallenge();
    const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'community' | 'my'>('all');

    const leaderboard = useChallengeLeaderboard(selectedChallenge || '');

    // Group badges by category
    const badgesByCategory = useMemo(() => {
        if (!badges) return {};
        const groups: Record<string, Badge[]> = {};
        badges.forEach(b => {
            if (!groups[b.category]) groups[b.category] = [];
            groups[b.category].push(b);
        });
        return groups;
    }, [badges]);

    const activeChallenges = useMemo(() => {
        if (!challenges) return [];
        let filtered = challenges.filter(c => c.status === 'active' || c.status === 'upcoming');

        if (activeTab === 'my') {
            filtered = filtered.filter(c => c.joined);
        } else if (activeTab === 'community') {
            filtered = filtered.filter(c => c.type === 'group');
        }

        return filtered;
    }, [challenges, activeTab]);

    // Calculate overall stats
    const totalXp = badges?.reduce((acc, b) => b.state === 'earned' ? acc + b.xpReward : acc, 0) || 0;
    const earnedCount = badges?.filter(b => b.state === 'earned').length || 0;
    const totalCount = badges?.length || 0;

    return (
        <div className="space-y-10 pb-20 max-w-6xl mx-auto">
            {/* Header Stats */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 p-8 md:p-12 text-white shadow-2xl group border border-white/10">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                    <Trophy className="w-80 h-80 -rotate-12 translate-x-12 -translate-y-12" />
                </div>

                <div className="absolute top-6 right-6 z-20">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="glass-button bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg backdrop-blur-md transition-all active:scale-95"
                    >
                        <PlusCircle className="w-4 h-4" /> Create Challenge
                    </button>
                </div>

                <div className="relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-indigo-400">
                            Achievement Hub
                        </h1>
                        <p className="text-indigo-200 mb-8 max-w-lg text-lg leading-relaxed">
                            Track your progress, earn rare badges, and compete with the community to reach new heights.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-indigo-300 text-sm font-medium mb-1 uppercase tracking-wider">Total XP Earned</div>
                            <div className="text-3xl font-bold flex items-center gap-3">
                                <div className="p-2 bg-yellow-400/20 rounded-lg">
                                    <Zap className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                                </div>
                                {totalXp.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-indigo-300 text-sm font-medium mb-1 uppercase tracking-wider">Badges Unlocked</div>
                            <div className="text-3xl font-bold flex items-center gap-3">
                                <div className="p-2 bg-indigo-400/20 rounded-lg">
                                    <Medal className="w-6 h-6 text-indigo-400" />
                                </div>
                                <span>{earnedCount} <span className="text-lg text-indigo-400/60 font-medium">/ {totalCount}</span></span>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="text-indigo-300 text-sm font-medium mb-1 uppercase tracking-wider">Active Challenges</div>
                            <div className="text-3xl font-bold flex items-center gap-3">
                                <div className="p-2 bg-rose-400/20 rounded-lg">
                                    <Target className="w-6 h-6 text-rose-400" />
                                </div>
                                {challenges?.filter(c => c.joined && c.status === 'active').length || 0}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Showcase */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-xl">
                        <Award className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Badge Collection</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Collect badges by completing habits and challenges</p>
                    </div>
                </div>

                {Object.entries(badgesByCategory).length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="space-y-8"
                    >
                        {Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
                            <div key={category} className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-1 border-l-4 border-indigo-500 ml-1">{category}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {categoryBadges.map((badge) => (
                                        <BadgeCard
                                            key={badge.id}
                                            badge={badge}
                                            onClick={() => setSelectedBadge(badge)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="text-center py-20 text-slate-500 glass-panel rounded-3xl">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p>Loading your collection...</p>
                    </div>
                )}
            </section>

            {/* Challenges Section */}
            <section className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/20 rounded-xl">
                            <Flame className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Active Challenges</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Join events to boost your XP</p>
                        </div>
                    </div>

                    <div className="flex p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl self-start md:self-auto border border-slate-200 dark:border-white/5">
                        {(['all', 'community', 'my'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-6 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                    activeTab === tab
                                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5"
                                )}
                            >
                                {tab === 'my' ? 'My Challenges' : tab}
                            </button>
                        ))}
                    </div>
                </div>

                {activeChallenges.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {activeChallenges.map((challenge) => (
                            <ChallengeCard
                                key={challenge.id}
                                challenge={challenge}
                                onJoin={() => joinChallenge.mutate(challenge.id, { onSuccess: () => setSelectedChallenge(challenge.id) })}
                                onLeave={() => leaveChallenge.mutate(challenge.id)}
                                onViewLeaderboard={() => setSelectedChallenge(selectedChallenge === challenge.id ? null : challenge.id)}
                                isSelected={selectedChallenge === challenge.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="lg:col-span-2 p-16 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 glass-panel">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/5">
                            <Calendar className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Active Challenges</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                            {activeTab === 'my'
                                ? "You haven't joined any challenges yet. Browse the community tab to find one!"
                                : "Check back later for new events or create your own to challenge others!"}
                        </p>
                        {activeTab === 'my' && (
                            <button
                                onClick={() => setActiveTab('all')}
                                className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                            >
                                Browse All Challenges
                            </button>
                        )}
                    </div>
                )}
            </section>

            {/* Leaderboard Section (Conditional) */}
            <AnimatePresence>
                {selectedChallenge && (
                    <motion.section
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-panel overflow-hidden rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-xl">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <Target className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Leaderboard: <span className="text-indigo-500">{challenges?.find(c => c.id === selectedChallenge)?.title}</span>
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedChallenge(null)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-xl transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-0">
                                {leaderboard.isLoading ? (
                                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>
                                ) : leaderboard.data && leaderboard.data.length > 0 ? (
                                    <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-96 overflow-y-auto custom-scrollbar">
                                        {leaderboard.data.map((entry) => (
                                            <div
                                                key={entry.userId}
                                                className={cn(
                                                    "flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors",
                                                    entry.isCurrentUser ? "bg-indigo-50/50 dark:bg-indigo-500/10" : ""
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border-2",
                                                        entry.rank === 1 ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" :
                                                            entry.rank === 2 ? "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600" :
                                                                entry.rank === 3 ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30" :
                                                                    "bg-white dark:bg-slate-800 text-slate-500 border-transparent dark:text-slate-400"
                                                    )}>
                                                        {entry.rank <= 3 ? (
                                                            entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'
                                                        ) : entry.rank}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                            {entry.name}
                                                            {entry.isCurrentUser && <span className="text-[10px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">You</span>}
                                                        </p>
                                                        {entry.completedAt && (
                                                            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Completed {formatDistanceToNow(new Date(entry.completedAt))} ago
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono tracking-tight">{entry.progress}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider opacity-60">Score</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>Be the first to join this challenge!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* History Section */}
            {historyData && historyData.history.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                        <Clock className="w-6 h-6 text-slate-400" />
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Challenge History</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {historyData.history.map((record) => (
                            <div key={record.id} className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col gap-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-900 dark:text-white">{record.title}</h4>
                                    <span className={cn(
                                        "text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider",
                                        record.state === 'completed'
                                            ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                    )}>
                                        {record.state}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 flex justify-between mt-auto pt-4 border-t border-slate-200 dark:border-white/5">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">Score: {record.progress} / {record.targetValue}</span>
                                    <span>{record.completedAt ? new Date(record.completedAt).toLocaleDateString() : 'Ended'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Modals */}
            <CreateChallengeModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <BadgeDetailModal
                badge={selectedBadge}
                onClose={() => setSelectedBadge(null)}
            />
        </div>
    );
};
