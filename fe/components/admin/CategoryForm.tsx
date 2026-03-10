'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Branch, Category, UserRole } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import Button from '@/components/ui/Button';
import { branchService } from '@/lib/api/branch-service';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatBranchLabel } from '@/lib/utils/format';

const categorySchema = z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters'),
    branchId: z.string().min(1, 'Branch is required'),
});

export type CategoryFormData = z.infer<typeof categorySchema> & {
    sharedBranchIds?: string[];
};



interface CategoryFormProps {
    initialData?: Category;
    onSubmit: (data: CategoryFormData) => Promise<void>;
    isLoading: boolean;
    isEdit?: boolean;
    theme?: 'light' | 'dark';
}

export default function CategoryForm({
    initialData,
    onSubmit,
    isLoading,
    isEdit = false,
    theme = 'light',
}: CategoryFormProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [sharedBranchIds, setSharedBranchIds] = useState<string[]>(initialData?.sharedBranchIds || []);
    const [isTransferable, setIsTransferable] = useState<boolean>(
        (initialData?.sharedBranchIds?.length || 0) > 0
    );
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const lockedBranchId = isManager ? user?.branchId : undefined;
    const initialBranchName = initialData?.branch?.name?.trim() || '';
    const initialBranchId = initialData?.branchId || initialData?.branch?.id || lockedBranchId || '';

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: initialData?.name || '',
            branchId: initialBranchId,
        },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const selectedBranchId = watch('branchId');
    const shareableBranches = selectedBranchId
        ? branches.filter((branch) => branch.id !== selectedBranchId)
        : [];

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await branchService.getBranches();
                setBranches(data);

                const fallbackBranchId = !initialBranchId && initialBranchName
                    ? data.find((branch) => branch.name.trim().toLowerCase() === initialBranchName.toLowerCase())?.id
                    : undefined;
                const preferredBranch =
                    initialBranchId ||
                    fallbackBranchId ||
                    (data.length === 1 ? data[0].id : '');

                if (preferredBranch) {
                    setValue('branchId', preferredBranch, { shouldValidate: true });
                }
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        };
        loadBranches();
    }, [initialBranchId, initialBranchName, setValue]);

    useEffect(() => {
        if (initialData?.sharedBranchIds) {
            setSharedBranchIds(initialData.sharedBranchIds);
            setIsTransferable(initialData.sharedBranchIds.length > 0);
        }
    }, [initialData?.id, initialData?.sharedBranchIds]);

    useEffect(() => {
        if (!selectedBranchId) return;
        setSharedBranchIds((prev) => prev.filter((id) => id !== selectedBranchId));
    }, [selectedBranchId]);

    const textColor = theme === 'light' ? 'text-[#1f1c17]' : 'text-white';
    const helperTextColor = theme === 'light' ? 'text-[#1f1c17]' : 'text-gray-300';

    return (
        <form
            onSubmit={handleSubmit((data) =>
                onSubmit({
                    ...data,
                    sharedBranchIds: isTransferable ? sharedBranchIds : [],
                })
            )}
            className={cn(
                'space-y-6',
                theme === 'light'
                    ? 'text-[#1f1c17] [&_label]:!text-[#1f1c17] [&_p]:!text-[#1f1c17] [&_span]:!text-[#1f1c17]'
                    : 'text-white'
            )}
        >
            <div className="space-y-4">
                <Input
                    label="Category Name"
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="Beverages"
                    labelClassName={theme === 'dark' ? 'text-white' : ''}
                />

                <Select
                    label="Branch"
                    {...register('branchId')}
                    value={selectedBranchId || ''}
                    error={errors.branchId?.message}
                    labelClassName={theme === 'dark' ? 'text-white' : ''}
                    options={
                        isManager && lockedBranchId
                            ? branches
                                .filter((b) => b.id === lockedBranchId)
                                .map((b) => ({ value: b.id, label: formatBranchLabel(b) }))
                            : [
                                { value: '', label: 'Select Branch' },
                                ...branches.map((b) => ({ value: b.id, label: formatBranchLabel(b) })),
                            ]
                    }
                    disabled={isManager || isEdit}
                />
                {isManager && (
                    <p className={cn('text-xs mt-1', helperTextColor)}>
                        Branch is locked to your assignment.
                    </p>
                )}

                {isEdit && (
                    <p className={cn('text-xs', helperTextColor)}>
                        Branch cannot be changed after category creation.
                    </p>
                )}

                <div className="pt-2">
                    <Checkbox
                        label="Share this category with other branches"
                        id="transferable"
                        checked={isTransferable}
                        labelClassName={theme === 'dark' ? 'text-white' : ''}
                        onChange={(event) => {
                            const checked = event.target.checked;
                            setIsTransferable(checked);
                            if (!checked) {
                                setSharedBranchIds([]);
                            }
                        }}
                    />
                    <p className={cn('mt-1 text-sm ml-7', helperTextColor)}>
                        Choose where this category should appear for menu creation.
                    </p>
                </div>

                {isTransferable && (
                    <div className={cn('grid gap-2 pl-7 border-l-2 ml-2', theme === 'light' ? 'border-gray-800' : 'border-gray-700')}>
                        {!selectedBranchId && (
                            <p className={cn('text-xs', helperTextColor)}>
                                Select a branch to choose sharing targets.
                            </p>
                        )}
                        {selectedBranchId && shareableBranches.length === 0 && (
                            <p className={cn('text-xs', helperTextColor)}>
                                No other branches available to share with.
                            </p>
                        )}
                        {selectedBranchId && shareableBranches.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {shareableBranches.map((branch) => {
                                    const checked = sharedBranchIds.includes(branch.id);
                                    return (
                                        <label key={branch.id} className={cn('flex items-center gap-2 text-sm', textColor)}>
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-700 bg-gray-900/50 text-purple-600 focus:ring-purple-500/20 focus:ring-2 transition-colors cursor-pointer"
                                                checked={checked}
                                                onChange={() => {
                                                    setSharedBranchIds((prev) =>
                                                        prev.includes(branch.id)
                                                            ? prev.filter((id) => id !== branch.id)
                                                            : [...prev, branch.id]
                                                    );
                                                }}
                                            />
                                            <span>{formatBranchLabel(branch)}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {selectedBranchId && shareableBranches.length > 0 && sharedBranchIds.length === 0 && (
                            <p className={cn('text-xs', helperTextColor)}>
                                Select at least one branch to enable sharing.
                            </p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Category' : 'Create Category'}
                </Button>
            </div>
        </form>
    );
}
