import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, type = 'text', ...props }, ref) => {
        const [focused, setFocused] = useState(false);
        const hasValue = props.value !== '' && props.value !== undefined;

        return (
            <div className="w-full">
                <div className="relative">
                    <input
                        ref={ref}
                        type={type}
                        className={cn(
                            'peer w-full rounded-lg border bg-gray-900/50 px-4 py-3 text-white placeholder-transparent transition-all duration-200 focus:outline-none focus:ring-2',
                            error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500/30',
                            className
                        )}
                        placeholder={label || props.placeholder}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        {...props}
                    />
                    {label && (
                        <label
                            className={cn(
                                'absolute left-4 transition-all duration-200 pointer-events-none',
                                focused || hasValue
                                    ? '-top-2.5 text-xs bg-gray-900 px-1'
                                    : 'top-3 text-base',
                                error
                                    ? 'text-red-400'
                                    : focused
                                        ? 'text-purple-400'
                                        : 'text-gray-400'
                            )}
                        >
                            {label}
                        </label>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-sm text-red-400">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
