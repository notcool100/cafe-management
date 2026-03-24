'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Branch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

type BranchSelectorVariant = 'sand' | 'slate';

interface BranchSelectorProps {
    branches: Branch[];
    value: string | null;
    onChange: (branchId: string) => void;
    variant?: BranchSelectorVariant;
    className?: string;
    buttonClassName?: string;
    menuClassName?: string;
    optionClassName?: string;
    disabled?: boolean;
}

const variantStyles: Record<
    BranchSelectorVariant,
    {
        button: string;
        buttonMeta: string;
        buttonIcon: string;
        menu: string;
        option: string;
        optionMeta: string;
        selectedOption: string;
        selectedOptionMeta: string;
    }
> = {
    sand: {
        button:
            'border-[#e4d7c2] bg-[#fdfaf3] text-[#5a3a2e] hover:border-[#5a3a2e] hover:bg-[#fffaf0] focus-visible:ring-[#5a3a2e]/20',
        buttonMeta: 'text-[#8b6f5f]',
        buttonIcon: 'text-[#8b6f5f]',
        menu: 'border-[#d8c7af] bg-[#fffaf0] shadow-[0_18px_45px_rgba(90,58,46,0.18)]',
        option: 'text-[#5a3a2e] hover:bg-[#f5ebda]',
        optionMeta: 'text-[#8b6f5f]',
        selectedOption: 'bg-[#5a3a2e] text-[#fffaf0] hover:bg-[#5a3a2e]',
        selectedOptionMeta: 'text-[#f3e7d2]',
    },
    slate: {
        button:
            'border-gray-200 bg-gray-100 text-gray-900 hover:border-gray-300 hover:bg-white focus-visible:ring-blue-500/20',
        buttonMeta: 'text-gray-500',
        buttonIcon: 'text-gray-500',
        menu: 'border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]',
        option: 'text-gray-900 hover:bg-gray-50',
        optionMeta: 'text-gray-500',
        selectedOption: 'bg-blue-50 text-blue-900 hover:bg-blue-50',
        selectedOptionMeta: 'text-blue-700',
    },
};

export default function BranchSelector({
    branches,
    value,
    onChange,
    variant = 'sand',
    className,
    buttonClassName,
    menuClassName,
    optionClassName,
    disabled = false,
}: BranchSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useId();
    const selectedBranch = branches.find((branch) => branch.id === value) ?? branches[0] ?? null;
    const styles = variantStyles[variant];

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleSelect = (branchId: string) => {
        onChange(branchId);
        setIsOpen(false);
    };

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-expanded={isOpen}
                disabled={disabled || branches.length === 0}
                onClick={() => setIsOpen((open) => !open)}
                className={cn(
                    'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60',
                    styles.button,
                    buttonClassName
                )}
            >
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5">
                        {selectedBranch?.name || 'Select branch'}
                    </p>
                    <p className={cn('truncate text-xs leading-5', styles.buttonMeta)}>
                        {selectedBranch?.location?.trim() || 'No location set'}
                    </p>
                </div>
                <svg
                    className={cn('h-4 w-4 flex-shrink-0 transition-transform', styles.buttonIcon, isOpen && 'rotate-180')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className={cn(
                        'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border',
                        styles.menu,
                        menuClassName
                    )}
                >
                    <ul id={listboxId} role="listbox" className="max-h-80 overflow-y-auto py-1">
                        {branches.map((branch) => {
                            const isSelected = branch.id === selectedBranch?.id;

                            return (
                                <li key={branch.id}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        title={`${branch.name}, ${branch.location || 'No location set'}`}
                                        onClick={() => handleSelect(branch.id)}
                                        className={cn(
                                            'flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors',
                                            isSelected ? styles.selectedOption : styles.option,
                                            optionClassName
                                        )}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold leading-5">
                                                {branch.name}
                                            </span>
                                            <span
                                                className={cn(
                                                    'mt-0.5 block truncate text-xs leading-5',
                                                    isSelected ? styles.selectedOptionMeta : styles.optionMeta
                                                )}
                                            >
                                                {branch.location?.trim() || 'No location set'}
                                            </span>
                                        </span>
                                        {isSelected && (
                                            <svg
                                                className="mt-0.5 h-4 w-4 flex-shrink-0"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
