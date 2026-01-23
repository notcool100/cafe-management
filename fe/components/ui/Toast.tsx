import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({
    message,
    type = 'info',
    isVisible,
    onClose,
    duration = 3000,
}: ToastProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300); // Wait for fade out animation
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !show) return null;

    const icons = {
        success: (
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    const bgColors = {
        success: 'bg-gray-900 border-green-500/30',
        error: 'bg-gray-900 border-red-500/30',
        info: 'bg-gray-900 border-blue-500/30',
    };

    return (
        <div
            className={cn(
                'fixed bottom-4 right-4 z-50 flex items-center p-4 mb-4 rounded-lg shadow-lg border transition-all duration-300 transform',
                bgColors[type],
                show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            )}
            role="alert"
        >
            <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg bg-gray-800">
                {icons[type]}
            </div>
            <div className="ml-3 text-sm font-medium text-gray-200 mr-2">{message}</div>
            <button
                type="button"
                className="ml-auto -mx-1.5 -my-1.5 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-800 inline-flex h-8 w-8 text-gray-500 hover:text-white"
                onClick={() => {
                    setShow(false);
                    setTimeout(onClose, 300);
                }}
            >
                <span className="sr-only">Close</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 14 14">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
            </button>
        </div>
    );
}
