import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart2, CheckCircle, Calendar, Settings, Moon, Sun, Trophy as TrophyIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { XpIndicator, XpDetailsModal } from '../gamification';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [isXpModalOpen, setIsXpModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors relative overflow-hidden">
            {/* Aurora Background Effect */}
            <div className="animate-aurora opacity-50 dark:opacity-30" />

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-r border-slate-200/50 dark:border-white/5 p-6 fixed h-full z-20 transition-colors">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-500 to-indigo-600 animate-pulse-glow">
                        Habit Tracer
                    </h1>
                    <button
                        onClick={toggleTheme}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors glass-button"
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {isDark ? (
                            <Sun className="w-5 h-5 text-yellow-400" />
                        ) : (
                            <Moon className="w-5 h-5 text-slate-500" />
                        )}
                    </button>
                </div>

                {user && (
                    <div className="mb-6 pb-6 border-b border-slate-200/50 dark:border-white/5 space-y-4">
                        <Link to="/profile" className="flex items-center gap-3 px-1 hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-lg transition-colors -mx-2 group">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform ring-2 ring-white/10">
                                {user.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white truncate text-sm">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">View Profile</p>
                            </div>
                        </Link>
                        <XpIndicator onClick={() => setIsXpModalOpen(true)} />
                    </div>
                )}

                <NavItems />

                <div className="mt-auto pt-6 border-t border-slate-200/50 dark:border-white/5">
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-2 transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 md:ml-64 relative z-10">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-white/10 flex justify-around items-center h-16 md:hidden z-50 transition-colors">
                <NavItems mobile />
            </nav>
            {/* XP Details Modal */}
            <XpDetailsModal
                isOpen={isXpModalOpen}
                onClose={() => setIsXpModalOpen(false)}
            />
        </div>
    );
};

const navItems = [
    { icon: Home, label: 'Today', path: '/' },
    { icon: CheckCircle, label: 'Habits', path: '/habits' },
    { icon: Calendar, label: 'Calendar', path: '/calendar' },
    { icon: BarChart2, label: 'Stats', path: '/analytics' },
    { icon: TrophyIcon, label: 'Challenges', path: '/challenges' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const location = useLocation();

    if (mobile) {
        return (
            <>
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors relative",
                                isActive
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-slate-400 dark:text-slate-500"
                            )}
                        >
                            {isActive && (
                                <span className="absolute -top-3 w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            )}
                            <item.icon className="w-5 h-5" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </>
        );
    }

    return (
        <nav className="space-y-1">
            {navItems.filter(item => item.path !== '/settings').map((item) => {
                const isActive = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                            isActive
                                ? "bg-indigo-50 dark:bg-white/10 text-indigo-600 dark:text-indigo-300 font-medium shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                        )}
                    >
                        <item.icon className={cn("w-5 h-5 transition-transform", isActive && "scale-110")} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
};
