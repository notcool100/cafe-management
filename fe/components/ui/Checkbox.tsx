import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="flex items-start">
                <div className="flex items-center h-5">
                    <input
                        type="checkbox"
                        className={cn(
                            'h-4 w-4 rounded border-gray-700 bg-gray-900/50 text-purple-600 focus:ring-purple-500/20 focus:ring-2 transition-colors cursor-pointer',
                            error ? 'border-red-500' : 'border-gray-700',
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                </div>
                {label && (
                    <div className="ml-3 text-sm">
                        <label htmlFor={props.id} className="font-medium text-gray-300 cursor-pointer select-none">
                            {label}
                        </label>
                        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                    </div>
                )}
            </div>
        );
    }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
