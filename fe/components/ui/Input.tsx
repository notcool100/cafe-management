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
        const [showPassword, setShowPassword] = useState(false);
        const isPassword = type === 'password';

        return (
            <div className="w-full">
                <div className="relative">
                    <input
                        ref={ref}
                        type={isPassword ? (showPassword ? 'text' : 'password') : type}
                        className={cn(
                            'peer w-full rounded-lg border bg-gray-900/50 px-4 py-3 text-white placeholder-transparent transition-all duration-200 focus:outline-none focus:ring-2',
                            isPassword && 'pr-12',
                            error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                                : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500/30',
                            className
                        )}
                        placeholder={props.placeholder || label || ' '}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        {...props}
                    />
                    {label && (
                        <label
                            className={cn(
                                'absolute left-4 transition-all duration-200 pointer-events-none',
                                'top-3 text-base',
                                'peer-focus:-top-2.5 peer-focus:text-xs peer-focus:bg-gray-900 peer-focus:px-1',
                                'peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-gray-900 peer-[:not(:placeholder-shown)]:px-1',
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
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88l-3.29-3.29m7.53 7.53l3.29 3.29M3 3l18 18M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M9.88 9.88a3 3 0 1 0 4.24 4.24" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                            )}
                        </button>
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
