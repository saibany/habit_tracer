import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Button } from '../../components/ui/Button';
import api from '../../lib/api';

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided.');
            return;
        }

        const verifyEmail = async () => {
            try {
                const { data } = await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(data.message || 'Email verified successfully!');
            } catch (err: any) {
                const response = err.response?.data;
                if (response?.code === 'TOKEN_EXPIRED') {
                    setStatus('expired');
                    setMessage(response.message || 'Verification link has expired.');
                } else {
                    setStatus('error');
                    setMessage(response?.message || 'Verification failed. Please try again.');
                }
            }
        };

        verifyEmail();
    }, [token]);

    const getStatusContent = () => {
        switch (status) {
            case 'loading':
                return {
                    icon: <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />,
                    title: "Verifying Email...",
                    desc: "Please wait while we verify your email address.",
                    action: null
                };
            case 'success':
                return {
                    icon: <CheckCircle className="w-12 h-12 text-teal-500" />,
                    title: "Email Verified!",
                    desc: message,
                    action: (
                        <Button
                            onClick={() => navigate('/login')}
                            fullWidth
                            size="lg"
                        >
                            Continue to Login
                        </Button>
                    )
                };
            case 'error':
                return {
                    icon: <XCircle className="w-12 h-12 text-red-500" />,
                    title: "Verification Failed",
                    desc: message,
                    action: (
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/login')}
                            fullWidth
                        >
                            Back to Login
                        </Button>
                    )
                };
            case 'expired':
                return {
                    icon: <RefreshCw className="w-12 h-12 text-amber-500" />,
                    title: "Link Expired",
                    desc: message,
                    action: (
                        <div className="space-y-3">
                            <Button
                                onClick={() => navigate('/login')}
                                fullWidth
                                size="lg"
                            >
                                Request New Link
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/login')}
                                fullWidth
                                size="sm"
                            >
                                Back to Login
                            </Button>
                        </div>
                    )
                };
        }
    };

    const content = getStatusContent();

    return (
        <AuthLayout>
            <div className="text-center py-6">
                <motion.div
                    key={status}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700/50"
                >
                    {content.icon}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {content.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                        {content.desc}
                    </p>

                    {content.action && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {content.action}
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </AuthLayout>
    );
};

