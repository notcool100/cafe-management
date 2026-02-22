import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass';
    hover?: boolean;
}

export function Card({ className, variant = 'default', hover, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-2xl p-6 transition-all duration-300',
                variant === 'glass'
                    ? 'bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-xl shadow-black/20'
                    : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50',
                hover && 'hover:shadow-2xl hover:shadow-purple-500/20 hover:border-purple-500/30 hover:-translate-y-1 hover:scale-[1.02] cursor-pointer',
                className
            )}
            {...props}
        />
    );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('mb-4', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h3 className={cn('text-xl font-semibold text-Black tracking-tight', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn('text-sm text-gray-400 leading-relaxed', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('mt-4 flex items-center gap-2', className)} {...props} />;
}
