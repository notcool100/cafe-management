'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuItem, MenuCategory, Branch, UserRole } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import { useEffect, useState } from 'react';
import { branchService } from '@/lib/api/branch-service';
import { useAuthStore } from '@/lib/store/auth-store';

const menuItemSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    category: z.nativeEnum(MenuCategory),
    branchId: z.string().min(1, 'Branch is required'),
    available: z.boolean(),
    isTransferable: z.boolean(),
    borrowedByBranchIds: z.array(z.string()),
});

export interface MenuItemFormData extends z.infer<typeof menuItemSchema> {
    imageFile?: File | null;
}

interface MenuItemFormProps {
    initialData?: MenuItem;
    onSubmit: (data: MenuItemFormData) => Promise<void>;
    isLoading: boolean;
    isEdit?: boolean;
    onImagePreview?: (file: File | null) => void;
}

export default function MenuItemForm({
    initialData,
    onSubmit,
    isLoading,
    isEdit = false,
    onImagePreview,
}: MenuItemFormProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const canManageBorrowing = !isManager;
    const lockedBranchId = isManager ? user?.branchId : undefined;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<MenuItemFormData>({
        resolver: zodResolver(menuItemSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price || 0,
            category: initialData?.category || MenuCategory.FOOD,
            branchId: initialData?.branchId || lockedBranchId || '',
            available: initialData?.available ?? true,
            isTransferable: initialData?.isTransferable ?? false,
            borrowedByBranchIds: initialData?.borrowedByBranchIds || [],
        },
    });

    const selectedBranchId = watch('branchId');
    const isTransferable = watch('isTransferable');
    const selectedBorrowedByBranchIds = watch('borrowedByBranchIds', []);

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await branchService.getBranches();
                setBranches(data);

                // Auto-select branch for managers or when only one branch is available
                const preferredBranch =
                    initialData?.branchId ||
                    lockedBranchId ||
                    (data.length === 1 ? data[0].id : '');

                if (preferredBranch) {
                    setValue('branchId', preferredBranch, { shouldValidate: true });
                }
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        };
        loadBranches();
    }, [initialData?.branchId, lockedBranchId, setValue]);

    useEffect(() => {
        if (!selectedBranchId) {
            return;
        }

        const filtered = selectedBorrowedByBranchIds.filter((branchId) => branchId !== selectedBranchId);
        if (filtered.length !== selectedBorrowedByBranchIds.length) {
            setValue('borrowedByBranchIds', filtered, { shouldValidate: true, shouldDirty: true });
        }
    }, [selectedBranchId, selectedBorrowedByBranchIds, setValue]);

    const toggleBorrowedBranch = (branchId: string) => {
        const next = selectedBorrowedByBranchIds.includes(branchId)
            ? selectedBorrowedByBranchIds.filter((id) => id !== branchId)
            : [...selectedBorrowedByBranchIds, branchId];

        setValue('borrowedByBranchIds', next, { shouldValidate: true, shouldDirty: true });
    };

    const borrowableBranches = branches.filter((branch) => branch.id !== selectedBranchId);

    return (
        <form
            onSubmit={handleSubmit((data) =>
                onSubmit({
                    ...data,
                    imageFile,
                    borrowedByBranchIds: data.isTransferable
                        ? data.borrowedByBranchIds.filter((branchId) => branchId !== data.branchId)
                        : [],
                })
            )}
            className="space-y-6"
        >
            <div className="space-y-4">
                <Input
                    label="Item Name"
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="Cheeseburger"
                />

                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                    </label>
                    <textarea
                        {...register('description')}
                        className="block w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-white shadow-sm transition-colors focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        rows={3}
                        placeholder="Delicious beef burger with cheese..."
                    />
                    {errors.description && (
                        <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Price"
                        type="number"
                        step="0.01"
                        {...register('price', { valueAsNumber: true })}
                        error={errors.price?.message}
                        placeholder="0.00"
                    />

                    <Select
                        label="Category"
                        {...register('category')}
                        error={errors.category?.message}
                        options={Object.values(MenuCategory).map(cat => ({
                            value: cat,
                            label: cat.charAt(0) + cat.slice(1).toLowerCase().replace('_', ' ')
                        }))}
                    />
                </div>

                <Select
                    label="Branch"
                    {...register('branchId')}
                    error={errors.branchId?.message}
                    options={
                        isManager && lockedBranchId
                            ? branches
                                .filter((b) => b.id === lockedBranchId)
                                .map((b) => ({ value: b.id, label: b.name }))
                            : [
                                { value: '', label: 'Select Branch' },
                                ...branches.map((b) => ({ value: b.id, label: b.name })),
                            ]
                    }
                    disabled={isManager}
                />
                {isManager && (
                    <p className="text-xs text-amber-300 mt-1">
                        Branch is locked to your assignment.
                    </p>
                )}

                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Item Image (Optional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                            const nextFile = event.target.files?.[0] || null;
                            setImageFile(nextFile);
                            onImagePreview?.(nextFile);
                        }}
                        className="block w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-white shadow-sm transition-colors file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-sm file:font-medium file:text-white hover:file:bg-gray-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    {initialData?.imageUrl && (
                        <p className="mt-1 text-xs text-gray-500">
                            Current image is set. Upload a new file to replace it.
                        </p>
                    )}
                </div>

                <div className="pt-2">
                    <Checkbox
                        label="Available"
                        {...register('available')}
                    />
                </div>

                <div className="pt-2">
                    <Checkbox
                        label="Transferable Item"
                        {...register('isTransferable')}
                        disabled={!canManageBorrowing}
                    />
                    {!canManageBorrowing && (
                        <p className="text-xs text-amber-300 mt-1">
                            Only admins can assign branch borrowing.
                        </p>
                    )}
                </div>

                {canManageBorrowing && isTransferable && (
                    <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3">
                        <p className="text-sm font-medium text-gray-200">Allow these branches to borrow this item</p>
                        <p className="mt-1 text-xs text-gray-400">
                            Borrowing branches can sell this item in their own menu.
                        </p>

                        <div className="mt-3 space-y-2">
                            {borrowableBranches.length === 0 ? (
                                <p className="text-xs text-gray-500">
                                    No other branches available to borrow this item.
                                </p>
                            ) : (
                                borrowableBranches.map((branch) => (
                                    <label key={branch.id} className="flex items-center gap-2 text-sm text-gray-200">
                                        <input
                                            type="checkbox"
                                            checked={selectedBorrowedByBranchIds.includes(branch.id)}
                                            onChange={() => toggleBorrowedBranch(branch.id)}
                                            className="h-4 w-4 rounded border-gray-700 bg-gray-900/50 text-purple-600 focus:ring-purple-500/20 focus:ring-2"
                                        />
                                        <span>{branch.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Menu Item' : 'Create Menu Item'}
                </Button>
            </div>
        </form>
    );
}
