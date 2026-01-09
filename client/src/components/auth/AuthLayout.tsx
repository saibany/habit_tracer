import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
    title?: string;
    subtitle?: string;
    showSocials?: boolean;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen w-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 md:p-8">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
                <div className="absolute top-0 -right-4 w-96 h-96 bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
                {/* Helper for dark mode specific glow */}
                <div className="absolute inset-0 bg-slate-950/50 hidden dark:block pointer-events-none" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md z-10"
            >
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                            HabitTracer
                        </span>
                    </Link>
                </div>

                {/* Card Content */}
                <div className="glass-panel rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl shadow-indigo-500/5 backdrop-blur-xl">
                    {(title || subtitle) && (
                        <div className="text-center mb-8">
                            {title && (
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    )}

                    {children}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-xs text-slate-400 dark:text-slate-500">
                    <p>© {new Date().getFullYear()} HabitTracer. All rights reserved.</p>
                    <div className="mt-2 flex justify-center gap-4">
                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms</a>
                        <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Help</a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
