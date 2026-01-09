import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
    {
        variants: {
            variant: {
                primary: "bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25 border-0",
                secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700",
                outline: "border border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100",
                ghost: "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
                danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:shadow-red-500/25",
                glass: "bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10 backdrop-blur-sm border border-white/10 text-white"
            },
            size: {
                default: "h-11 px-4 py-2",
                sm: "h-9 rounded-lg px-3",
                lg: "h-12 rounded-xl px-8 text-base",
                icon: "h-10 w-10",
            },
            fullWidth: {
                true: "w-full",
            }
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
            fullWidth: false
        },
    }
);

export interface ButtonProps
    extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag' | 'ref'>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

// Separate motion props content to avoid type conflicts with standard HTML button
const MotionButton = motion.button;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, fullWidth, isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
        return (
            <MotionButton
                ref={ref}
                className={cn(buttonVariants({ variant, size, fullWidth, className }))}
                disabled={isLoading || props.disabled}
                whileTap={{ scale: 0.98 }}
                {...(props as any)}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </MotionButton>
        );
    }
);

Button.displayName = "Button";

export { Button, buttonVariants };
