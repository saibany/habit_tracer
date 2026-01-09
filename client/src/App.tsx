import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { AllHabitsPage } from './pages/AllHabitsPage';
import { HabitDetailPage } from './pages/HabitDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChallengesPage } from './pages/ChallengesPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                    <p className="text-slate-500 dark:text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                <Route path="/*" element={
                    <ProtectedRoute>
                        <AppShell>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/habits" element={<AllHabitsPage />} />
                                <Route path="/habits/:id" element={<HabitDetailPage />} />
                                <Route path="/analytics" element={<AnalyticsPage />} />
                                <Route path="/challenges" element={<ChallengesPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/calendar" element={<CalendarPage />} />
                                <Route path="/settings" element={<SettingsPage />} />
                            </Routes>
                        </AppShell>
                    </ProtectedRoute>
                } />
            </Routes>
            <Toaster />
        </>);
}

export default App;
