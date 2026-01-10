import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import api from '../../lib/api';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Redirect if already logged in
    if (isAuthenticated) {
        navigate('/');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            setError('Password must contain uppercase, lowercase, and number');
            return;
        }

        setIsLoading(true);

        try {
            const { data } = await api.post('/auth/register', { email, password, name });
            setSuccess(data); // Store full response to access metadata

            // Only auto-redirect if there's NO verification link (production mode)
            // In dev mode with verification link, user must manually verify first
            if (!data?.metadata?.verificationUrl) {
                setTimeout(() => {
                    navigate('/login', { state: { message: 'Account created! Please check your email to verify your account.' } });
                }, 5000);
            }
        } catch (err: any) {
            const response = err.response?.data;
            const errorMessage = response?.message || response?.error || 'Registration failed. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        // Check for dev mode verification URL
        // @ts-ignore - metadata is added in dev mode
        const verificationUrl = (success as any)?.metadata?.verificationUrl;

        return (
            <AuthLayout>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                    >
                        <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-teal-500" />
                        </div>
                    </motion.div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {verificationUrl ? 'Verify Your Email' : 'Check your email!'}
                    </h2>

                    {verificationUrl ? (
                        <div className="my-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-left">
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                Dev Mode Enabled
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                                Email sending is disabled. Use the link below to verify:
                            </p>
                            <a
                                href={verificationUrl}
                                className="block w-full py-2 px-4 bg-amber-100 dark:bg-amber-800/50 text-amber-900 dark:text-amber-200 text-center rounded-lg font-mono text-xs break-all hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                            >
                                {verificationUrl}
                            </a>
                            <Button
                                className="mt-3 w-full bg-amber-500 hover:bg-amber-600 border-amber-600 text-white"
                                onClick={() => window.location.href = verificationUrl}
                            >
                                Verify Account Now
                            </Button>
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            We've sent a verification link to<br />
                            <span className="font-medium text-slate-900 dark:text-white">{email}</span>
                        </p>
                    )}

                    {!verificationUrl && (
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                            Redirecting to login in 3 seconds...
                        </p>
                    )}

                    <Button
                        variant="outline"
                        onClick={() => navigate('/login')}
                        className="mt-6"
                    >
                        Go to Login Now
                    </Button>
                </motion.div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Start your journey to better habits today"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center font-medium"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    <Input
                        label="Full Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Doe"
                        required
                        autoComplete="name"
                        leftIcon={<User className="w-4 h-4" />}
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        leftIcon={<Mail className="w-4 h-4" />}
                    />

                    <div className="space-y-2">
                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            leftIcon={<Lock className="w-4 h-4" />}
                            helperText="Must be at least 8 characters with uppercase, lowercase, and number"
                        />

                        {/* Password strength visual indicator could go here */}
                    </div>
                </div>

                <Button
                    type="submit"
                    isLoading={isLoading}
                    fullWidth
                    size="lg"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                    Create Account
                </Button>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors">
                        Sign In
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
};
