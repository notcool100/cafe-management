import { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    description?: string;
    labelClassName?: string;
    descriptionClassName?: string;
    optionClassName?: string;
    options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, description, labelClassName, descriptionClassName, optionClassName, options, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className={cn('block text-sm font-medium text-gray-300 mb-1', labelClassName)}>
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        className={cn(
                            'block w-full rounded-lg border bg-gray-900/50 text-white shadow-sm transition-colors focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 appearance-none',
                            'px-3 py-2 text-sm',
                            error
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-gray-700 focus:border-purple-500 focus:ring-purple-500/20',
                            className
                        )}
                        ref={ref}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value} className={cn('bg-gray-900 text-white', optionClassName)}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                {description && !error && (
                    <p className={cn('mt-1 text-xs text-gray-500', descriptionClassName)}>{description}</p>
                )}
                {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';

export default Select;
