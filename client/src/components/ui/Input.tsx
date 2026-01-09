import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    success?: boolean;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, success, helperText, leftIcon, rightIcon, containerClassName, id, ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        // Auto-generate ID if not provided, for label association
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
        const isPassword = type === 'password';
        const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;

        return (
            <div className={cn("w-full space-y-1.5", containerClassName)}>
                {label && (
                    <label
                        htmlFor={inputId}
                        className={cn(
                            "text-sm font-medium transition-colors ml-1",
                            error ? "text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300"
                        )}
                    >
                        {label}
                    </label>
                )}

                <div className="relative group">
                    {/* Left Icon */}
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none z-10">
                            {leftIcon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        type={effectiveType}
                        className={cn(
                            "flex w-full rounded-xl border bg-white dark:bg-slate-800 px-4 py-3 text-sm transition-all outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
                            leftIcon ? "pl-10" : "",
                            (rightIcon || isPassword || error || success) ? "pr-10" : "",
                            error
                                ? "border-red-300 dark:border-red-800 focus-visible:border-red-500 focus-visible:ring-red-200 dark:focus-visible:ring-red-900/30 text-red-900 dark:text-red-100"
                                : success
                                    ? "border-teal-300 dark:border-teal-800 focus-visible:border-teal-500 focus-visible:ring-teal-200 dark:focus-visible:ring-teal-900/30"
                                    : "border-slate-200 dark:border-slate-700 focus-visible:border-indigo-500 focus-visible:ring-indigo-200 dark:focus-visible:ring-indigo-800 text-slate-900 dark:text-white",
                            className
                        )}
                        onFocus={(e) => {
                            props.onFocus?.(e);
                        }}
                        onBlur={(e) => {
                            props.onBlur?.(e);
                        }}
                        aria-invalid={!!error}
                        {...props}
                    />

                    {/* Right Icon / Actions */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isPassword && (
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none focus:text-indigo-500"
                                tabIndex={-1}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        )}

                        {rightIcon && !isPassword && !error && !success && (
                            <div className="text-slate-400 pointer-events-none">
                                {rightIcon}
                            </div>
                        )}

                        {error && <AlertCircle className="h-4 w-4 text-red-500 animate-in fade-in zoom-in duration-200" />}
                        {success && <CheckCircle2 className="h-4 w-4 text-teal-500 animate-in fade-in zoom-in duration-200" />}
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -5, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -5, height: 0 }}
                            className="text-xs text-red-500 dark:text-red-400 font-medium ml-1"
                            role="alert"
                        >
                            {error}
                        </motion.p>
                    )}

                    {!error && helperText && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                            {helperText}
                        </p>
                    )}
                </AnimatePresence>
            </div>
        );
    }
);

Input.displayName = "Input";

export { Input };
