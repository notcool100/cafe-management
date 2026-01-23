import { cn } from '@/lib/utils/cn';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({
    className,
    width,
    height,
    variant = 'rectangular',
    ...props
}: SkeletonProps) {
    return (
        <div
            className={cn(
                'animate-pulse bg-gray-800',
                variant === 'circular' ? 'rounded-full' : 'rounded-md',
                className
            )}
            style={{
                width: width,
                height: height
            }}
            {...props}
        />
    );
}
