import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, fullWidth, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary: 'bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white hover:from-purple-500 hover:via-purple-400 hover:to-indigo-500 focus:ring-purple-500 shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105',
            secondary: 'bg-gradient-to-r from-gray-700 to-gray-600 text-white hover:from-gray-600 hover:to-gray-500 focus:ring-gray-500 shadow-md hover:shadow-lg',
            danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-500 hover:to-pink-500 focus:ring-red-500 shadow-lg shadow-red-500/40 hover:shadow-xl hover:shadow-red-500/60',
            ghost: 'text-gray-300 hover:bg-white/10 hover:text-white focus:ring-gray-500 backdrop-blur-sm',
            outline: 'border-2 border-gray-600/50 text-gray-300 hover:bg-white/5 hover:border-purple-500/50 hover:text-white focus:ring-gray-500 backdrop-blur-sm',
        };

        const sizes = {
            sm: 'px-3 py-2 text-sm',
            md: 'px-5 py-2.5 text-base',
            lg: 'px-7 py-3.5 text-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    baseStyles,
                    variants[variant],
                    sizes[size],
                    fullWidth && 'w-full',
                    className
                )}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && (
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
