import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSettings, useUpdateSettings, useExportData, useDeleteAccount } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Loader2, Download, Trash2, User, Globe, Bell, Moon, Sun, LogOut, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { theme, setTheme, isDark } = useTheme();
    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();
    const exportData = useExportData();
    const deleteAccount = useDeleteAccount();

    const [deletePassword, setDeletePassword] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleToggle = (key: string, value: boolean) => {
        updateSettings.mutate({ [key]: value });
    };

    const handleExport = async () => {
        try {
            const data = await exportData.mutateAsync();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'habit-tracker-export.json';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            alert('Export failed. Please try again.');
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount.mutateAsync(deletePassword);
            logout();
            navigate('/login');
        } catch (e) {
            alert('Failed to delete account. Check your password.');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <motion.header
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your account and preferences</p>
            </motion.header>

            {/* Profile Section */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
            >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Profile
                </h2>

                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl text-white font-bold shadow-lg">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                        <p className="text-xl font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                        <p className="text-slate-500 dark:text-slate-400">{user?.email}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">Level {user?.level || 1}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{user?.xp || 0} XP</p>
                    </div>
                </div>
            </motion.section>

            {/* Appearance */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
            >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Moon className="w-5 h-5" />
                    Appearance
                </h2>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Globe },
                    ].map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setTheme(option.id as 'light' | 'dark' | 'system')}
                            className={cn(
                                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                                theme === option.id
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                                    : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                            )}
                        >
                            <option.icon className="w-6 h-6" />
                            <span className="text-sm font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
            </motion.section>

            {/* Preferences */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
            >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                </h2>

                <div className="space-y-4">
                    <SettingRow
                        label="Push Notifications"
                        description="Get reminders for your habits"
                        enabled={settings?.settings?.notificationsEnabled || false}
                        onToggle={(v) => handleToggle('notificationsEnabled', v)}
                    />
                    <SettingRow
                        label="Email Reminders"
                        description="Weekly progress summary"
                        enabled={settings?.settings?.emailReminders || false}
                        onToggle={(v) => handleToggle('emailReminders', v)}
                    />
                </div>
            </motion.section>

            {/* Data */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6"
            >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Data & Account</h2>

                <div className="space-y-3">
                    <button
                        onClick={handleExport}
                        disabled={exportData.isPending}
                        className="w-full flex items-center justify-between py-4 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {exportData.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Download className="w-5 h-5" />
                            )}
                            <span>Export All Data</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between py-4 px-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="w-5 h-5" />
                            <span>Sign Out</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
            </motion.section>

            {/* Danger Zone */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 p-6"
            >
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-400 mb-2">Danger Zone</h2>
                <p className="text-red-700 dark:text-red-300 text-sm mb-4">
                    Deleting your account will permanently remove all your data.
                </p>

                {showDeleteConfirm ? (
                    <div className="space-y-3">
                        <input
                            type="password"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Enter your password to confirm"
                            className="w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-700 bg-white dark:bg-slate-800 focus:border-red-500 outline-none text-slate-900 dark:text-white"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteAccount.isPending || !deletePassword}
                                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium disabled:opacity-50"
                            >
                                {deleteAccount.isPending ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 py-3 px-4 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                        Delete Account
                    </button>
                )}
            </motion.section>
        </div>
    );
};

const SettingRow = ({
    label,
    description,
    enabled,
    onToggle
}: {
    label: string;
    description: string;
    enabled: boolean;
    onToggle: (value: boolean) => void;
}) => (
    <div className="flex items-center justify-between py-2">
        <div>
            <p className="font-medium text-slate-900 dark:text-white">{label}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <button
            onClick={() => onToggle(!enabled)}
            className={cn(
                "w-12 h-7 rounded-full transition-colors",
                enabled ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-600'
            )}
        >
            <div className={cn(
                "w-5 h-5 rounded-full bg-white shadow transform transition-transform",
                enabled ? 'translate-x-6' : 'translate-x-1'
            )} />
        </button>
    </div>
);
