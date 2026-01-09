import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';

export const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorCode, setErrorCode] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResendLoading, setIsResendLoading] = useState(false);

    // Check for success message from registration
    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            // Clear the state to prevent showing on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Redirect if already logged in
    if (isAuthenticated) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setErrorCode('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            const response = err.response?.data;
            const errorMessage = response?.message || response?.error || 'Login failed. Please check your credentials.';
            setError(errorMessage);
            setErrorCode(response?.code || '');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setIsResendLoading(true);
        try {
            const { data } = await api.post('/auth/resend-verification', { email });

            // @ts-ignore - metadata is added in dev mode
            if (data?.metadata?.verificationUrl) {
                setSuccessMessage(`DEV MODE: Verification link: ${data.metadata.verificationUrl}`);
                // Also open in new tab for convenience
                window.open(data.metadata.verificationUrl, '_blank');
            } else {
                setSuccessMessage('Verification email resent! Please check your inbox.');
            }

            setError('');
            setErrorCode('');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to resend email.';
            setError(errorMessage);
        } finally {
            setIsResendLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Enter your credentials to access your account"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                    {successMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl flex items-start gap-3"
                        >
                            <CheckCircle className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-teal-700 dark:text-teal-300">{successMessage}</p>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl"
                        >
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>

                                    {errorCode === 'EMAIL_NOT_VERIFIED' && (
                                        <button
                                            type="button"
                                            onClick={handleResendVerification}
                                            disabled={isResendLoading}
                                            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline disabled:opacity-50"
                                        >
                                            {isResendLoading ? 'Sending...' : 'Resend Verification Email'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="username"
                        leftIcon={<Mail className="w-4 h-4" />}
                        error={error && !errorCode ? " " : undefined} // Only highlight if generic error, distinct from password
                    />

                    <div className="space-y-1">
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            leftIcon={<Lock className="w-4 h-4" />}
                            error={error && !errorCode ? " " : undefined}
                        />
                        <div className="flex justify-end">
                            <Link
                                to="/forgot-password"
                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    isLoading={isLoading}
                    fullWidth
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                    Sign In
                </Button>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" type="button" size="default">
                        Google
                    </Button>
                    <Button variant="outline" type="button" size="default">
                        GitHub
                    </Button>
                </div>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
                        Create account
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
};
