import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import api from '../../lib/api';

export const VerifyEmailPage = () => {
    const [searchParams] = useSearchParams();
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

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-700 text-center"
            >
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 animate-spin text-indigo-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Verifying your email...
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Please wait while we verify your email address.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-10 h-10 text-teal-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Email Verified!
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            {message}
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg"
                        >
                            Go to Login
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Verification Failed
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            {message}
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-3.5 rounded-xl transition-all"
                        >
                            Back to Login
                        </Link>
                    </>
                )}

                {status === 'expired' && (
                    <>
                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <RefreshCw className="w-10 h-10 text-amber-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Link Expired
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            {message}
                        </p>
                        <Link
                            to="/login"
                            className="inline-block w-full bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg"
                        >
                            Request New Link
                        </Link>
                    </>
                )}
            </motion.div>
        </div>
    );
};
