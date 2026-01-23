import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md' | 'lg';
}

export default function Badge({ className, variant = 'default', size = 'sm', ...props }: BadgeProps) {
    const variants = {
        default: 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 text-gray-200 border-gray-400/40 shadow-sm',
        success: 'bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-300 border-emerald-400/40 shadow-emerald-500/20',
        warning: 'bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-orange-300 border-orange-400/40 shadow-orange-500/20',
        danger: 'bg-gradient-to-r from-red-500/30 to-pink-500/30 text-red-300 border-red-400/40 shadow-red-500/20',
        info: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-blue-300 border-blue-400/40 shadow-blue-500/20',
    };

    const sizes = {
        sm: 'text-xs px-2.5 py-1',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full font-semibold border backdrop-blur-sm',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}
