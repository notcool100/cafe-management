'use client';

import { cn } from '@/lib/utils/cn';
import { resolveImageUrl } from '@/lib/utils/image';

interface UserAvatarProps {
    imageUrl?: string | null;
    name?: string | null;
    alt?: string;
    className?: string;
    textClassName?: string;
    sizes?: string;
}

export default function UserAvatar({
    imageUrl,
    name,
    alt,
    className,
    textClassName,
    sizes = '56px',
}: UserAvatarProps) {
    const resolvedImageUrl = resolveImageUrl(imageUrl);
    const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';

    return (
        <div
            className={cn(
                'relative flex items-center justify-center overflow-hidden rounded-full bg-[#5a3a2e] text-[#fffaf0]',
                className
            )}
        >
            {resolvedImageUrl ? (
                <img
                    src={resolvedImageUrl}
                    alt={alt || `${name || 'User'} photo`}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span className={cn('font-bold', textClassName)}>{initial}</span>
            )}
        </div>
    );
}
