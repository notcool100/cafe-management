'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuItem, Branch, UserRole, Category } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { branchService } from '@/lib/api/branch-service';
import { useAuthStore } from '@/lib/store/auth-store';
import { categoryService } from '@/lib/api/category-service';

const menuItemSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    category: z.string().min(1, 'Category is required'),
    branchId: z.string().min(1, 'Branch is required'),
    available: z.boolean(),
});

export interface MenuItemFormData extends z.infer<typeof menuItemSchema> {
    imageFile?: File | null;
    sharedBranchIds?: string[];
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
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [sharedBranchIds, setSharedBranchIds] = useState<string[]>(initialData?.sharedBranchIds || []);
    const [isTransferable, setIsTransferable] = useState<boolean>(
        (initialData?.sharedBranchIds?.length || 0) > 0
    );
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const lockedBranchId = isManager ? user?.branchId : undefined;
    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setImageFile(file);
        if (onImagePreview) {
            onImagePreview(file);
        }
    };

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
            category: initialData?.category || '',
            branchId: initialData?.branchId || lockedBranchId || '',
            available: initialData?.available ?? true,
        },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const selectedBranchId = watch('branchId');
    // eslint-disable-next-line react-hooks/incompatible-library
    const selectedCategory = watch('category');
    const shareableBranches = selectedBranchId
        ? branches.filter((branch) => branch.id !== selectedBranchId)
        : [];

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
        if (initialData?.sharedBranchIds) {
            setSharedBranchIds(initialData.sharedBranchIds);
            setIsTransferable(initialData.sharedBranchIds.length > 0);
        }
    }, [initialData?.id, initialData?.sharedBranchIds]);

    useEffect(() => {
        if (!selectedBranchId) return;
        setSharedBranchIds((prev) => prev.filter((id) => id !== selectedBranchId));
    }, [selectedBranchId]);

    useEffect(() => {
        if (!selectedBranchId) {
            setCategories([]);
            return;
        }
        let active = true;
        const loadCategories = async () => {
            try {
                setCategoryLoading(true);
                const data = await categoryService.getCategories(selectedBranchId);
                if (active) {
                    setCategories(data);
                }
            } catch (error) {
                console.error('Failed to load categories:', error);
                if (active) {
                    setCategories([]);
                }
            } finally {
                if (active) {
                    setCategoryLoading(false);
                }
            }
        };
        loadCategories();
        return () => {
            active = false;
        };
    }, [selectedBranchId]);

    useEffect(() => {
        if (!selectedBranchId || selectedCategory || categories.length === 0) return;
        setValue('category', categories[0].name, { shouldValidate: true });
    }, [categories, selectedBranchId, selectedCategory, setValue]);

    const categoryOptions = useMemo(() => {
        const seen = new Set<string>();
        const options = categories.flatMap((cat) => {
            const name = cat.name?.trim();
            if (!name) return [];
            const key = name.toLowerCase();
            if (seen.has(key)) return [];
            seen.add(key);
            return [{ value: name, label: name }];
        });
        const selected = selectedCategory?.trim();
        if (selected) {
            const key = selected.toLowerCase();
            if (!seen.has(key)) {
                options.unshift({ value: selected, label: selected });
            }
        }
        return options;
    }, [categories, selectedCategory]);

    return (
        <form
            onSubmit={handleSubmit((data) =>
                onSubmit({
                    ...data,
                    imageFile,
                    sharedBranchIds: isTransferable ? sharedBranchIds : [],
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
                    <label className="block text-sm font-medium text-black-300 mb-1">
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

                    <div className="w-full">
                        <Input
                            label="Category"
                            list="menu-category-options"
                            {...register('category')}
                            error={errors.category?.message}
                            placeholder="e.g. Beverage"
                            helperText={
                                categoryLoading
                                    ? 'Loading categories...'
                                    : categoryOptions.length > 0
                                        ? 'Pick an existing category or type a new one.'
                                        : 'Type a category name to create a new one.'
                            }
                        />
                        <datalist id="menu-category-options">
                            {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value} />
                            ))}
                        </datalist>
                    </div>
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

                <div className="pt-2">
                    <Checkbox
                        label="Transferable to other branches"
                        id="transferable"
                        checked={isTransferable}
                        onChange={(event) => {
                            const checked = event.target.checked;
                            setIsTransferable(checked);
                            if (!checked) {
                                setSharedBranchIds([]);
                            }
                        }}
                    />
                    <p className="mt-1 text-sm text-gray-500 ml-7">
                        Enable this to share the item with selected branches in the same organization.
                    </p>
                </div>

                {isTransferable && (
                    <div className="grid gap-2 pl-7 border-l-2 border-gray-800 ml-2">
                        {!selectedBranchId && (
                            <p className="text-xs text-gray-500">
                                Select a branch to choose sharing targets.
                            </p>
                        )}
                        {selectedBranchId && shareableBranches.length === 0 && (
                            <p className="text-xs text-gray-500">
                                No other branches available to share with.
                            </p>
                        )}
                        {selectedBranchId && shareableBranches.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {shareableBranches.map((branch) => {
                                    const checked = sharedBranchIds.includes(branch.id);
                                    return (
                                        <label key={branch.id} className="flex items-center gap-2 text-sm text-gray-200">
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
                                            <span>{branch.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {selectedBranchId && shareableBranches.length > 0 && sharedBranchIds.length === 0 && (
                            <p className="text-xs text-amber-300">
                                Select at least one branch to enable sharing.
                            </p>
                        )}
                    </div>
                )}

                <div className="w-full">
                    <label className="block text-sm font-medium text-black-300 mb-1">
                        Item Image (Optional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full rounded-lg border border-gray-700 bg-gray-900/50 px-3 py-2 text-white shadow-sm transition-colors file:mr-4 file:rounded file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-sm file:font-medium file:text-white hover:file:bg-gray-600 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    {initialData?.imageUrl && (
                        <p className="mt-1 text-xs text-black-500">
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
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Menu Item' : 'Create Menu Item'}
                </Button>
            </div>
        </form>
    );
}
