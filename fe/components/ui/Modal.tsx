import React, { useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fullContent?: boolean;
    theme?: 'dark' | 'light';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', fullContent = false, theme = 'dark' }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    const themeStyles = {
        dark: {
            container: 'bg-gray-900 border-gray-700',
            header: 'border-gray-700',
            title: 'text-white',
            close: 'text-gray-400 hover:text-white',
        },
        light: {
            container: 'bg-white border-gray-200',
            header: 'border-gray-200',
            title: 'text-gray-900',
            close: 'text-gray-500 hover:text-gray-900',
        },
    };

    const styles = themeStyles[theme];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={cn(
                    'relative w-full rounded-xl border shadow-2xl animate-in zoom-in-95 duration-200',
                    styles.container,
                    sizes[size]
                )}
            >
                {/* Header */}
                {title && (
                    <div className={cn('flex items-center justify-between p-6 border-b', styles.header)}>
                        <h2 className={cn('text-xl font-semibold', styles.title)}>{title}</h2>
                        <button
                            onClick={onClose}
                            className={cn('transition-colors', styles.close)}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className={cn("p-6", fullContent && "p-0")}>
                    {children}
                </div>
            </div>
        </div>
    );
}
