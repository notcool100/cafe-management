'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuItem, Branch, UserRole, Category, MenuItemToppingDraft, MenuItemToppingUpdateDraft } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { branchService } from '@/lib/api/branch-service';
import { useAuthStore } from '@/lib/store/auth-store';
import { categoryService } from '@/lib/api/category-service';
import { cn } from '@/lib/utils/cn';
import { formatBranchLabel } from '@/lib/utils/format';

const menuItemSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().positive('Price must be greater than 0'),
    category: z.string().min(1, 'Category is required'),
    branchId: z.string().min(1, 'Branch is required'),
    available: z.boolean(),
});

export interface MenuItemFormData extends z.infer<typeof menuItemSchema> {
    imageFile?: File | null;
    sharedBranchIds?: string[];
    toppingIds?: string[];
    newToppings?: MenuItemToppingDraft[];
    updatedToppings?: MenuItemToppingUpdateDraft[];
}

interface ToppingDraftRow {
    id: string;
    toppingId?: string;
    name: string;
    price: string;
}

interface MenuItemFormProps {
    initialData?: MenuItem;
    onSubmit: (data: MenuItemFormData) => Promise<void>;
    isLoading: boolean;
    isEdit?: boolean;
    onImagePreview?: (file: File | null) => void;
    theme?: 'dark' | 'light';
    showToppingsSection?: boolean;
}

const createToppingRow = (): ToppingDraftRow => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    price: '',
});

const createToppingRowFromItem = (topping: MenuItem): ToppingDraftRow => ({
    id: `existing-${topping.id}`,
    toppingId: topping.id,
    name: topping.name || '',
    price: topping.price ? String(topping.price) : '',
});

interface SanitizedToppingsPayload {
    toppingIds: string[];
    newToppings?: MenuItemToppingDraft[];
    updatedToppings?: MenuItemToppingUpdateDraft[];
}

export default function MenuItemForm({
    initialData,
    onSubmit,
    isLoading,
    isEdit = false,
    onImagePreview,
    theme = 'dark',
    showToppingsSection = false,
}: MenuItemFormProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [sharedBranchIds, setSharedBranchIds] = useState<string[]>(initialData?.sharedBranchIds || []);
    const [isTransferable, setIsTransferable] = useState<boolean>(
        (initialData?.sharedBranchIds?.length || 0) > 0
    );
    const [toppingRows, setToppingRows] = useState<ToppingDraftRow[]>([]);
    const [toppingError, setToppingError] = useState<string | null>(null);
    const {
        user,
        selectedBranchId: storeSelectedBranchId,
        accessToken,
        refreshToken,
        hasHydrated,
        isAuthenticated,
    } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const lockedBranchId = isManager ? storeSelectedBranchId : undefined;
    const initialBranchName = initialData?.branch?.name?.trim() || '';
    const initialBranchId = initialData?.branchId || initialData?.branch?.id || lockedBranchId || '';
    const canUseProtectedApis = hasHydrated && isAuthenticated;
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
        clearErrors,
        reset,
        setValue,
        watch,
    } = useForm<MenuItemFormData>({
        resolver: zodResolver(menuItemSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price || 0,
            category: initialData?.category || '',
            branchId: initialBranchId,
            available: initialData?.available ?? true,
        },
    });

    const selectedBranchId = watch('branchId');
    const selectedCategory = watch('category');
    const previousBranchIdRef = useRef<string | null>(initialBranchId || null);
    const shareableBranches = selectedBranchId
        ? branches.filter((branch) => branch.id !== selectedBranchId)
        : [];

    useEffect(() => {
        if (!isEdit || !initialData) {
            return;
        }

        reset({
            name: initialData.name || '',
            description: initialData.description || '',
            price: initialData.price || 0,
            category: initialData.category || '',
            branchId: initialData.branchId || initialData.branch?.id || lockedBranchId || '',
            available: initialData.available ?? true,
        });
        setImageFile(null);
        setToppingRows(
            showToppingsSection
                ? (initialData.toppings || []).map(createToppingRowFromItem)
                : []
        );
        setToppingError(null);
    }, [initialData, isEdit, lockedBranchId, reset, showToppingsSection]);

    useEffect(() => {
        if (!canUseProtectedApis) {
            return;
        }

        if (typeof window === 'undefined') {
            return;
        }

        if (accessToken && !localStorage.getItem('access_token')) {
            localStorage.setItem('access_token', accessToken);
        }

        if (refreshToken && !localStorage.getItem('refresh_token')) {
            localStorage.setItem('refresh_token', refreshToken);
        }
    }, [accessToken, canUseProtectedApis, refreshToken]);

    useEffect(() => {
        if (!canUseProtectedApis) {
            return;
        }

        const loadBranches = async () => {
            try {
                const data = await branchService.getBranches();
                setBranches(data);

                // Auto-select branch for managers or when only one branch is available
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
    }, [canUseProtectedApis, initialBranchId, initialBranchName, setValue]);

    useEffect(() => {
        if (initialData?.sharedBranchIds) {
            setSharedBranchIds(initialData.sharedBranchIds);
            setIsTransferable(initialData.sharedBranchIds.length > 0);
            return;
        }

        if (isEdit) {
            setSharedBranchIds([]);
            setIsTransferable(false);
        }
    }, [initialData?.id, initialData?.sharedBranchIds, isEdit]);

    useEffect(() => {
        if (!selectedBranchId) return;
        setSharedBranchIds((prev) => prev.filter((id) => id !== selectedBranchId));
    }, [selectedBranchId]);

    useEffect(() => {
        const previousBranchId = previousBranchIdRef.current;

        if (!selectedBranchId) {
            if (previousBranchId) {
                setValue('category', '', { shouldValidate: false });
                clearErrors('category');
            }
            previousBranchIdRef.current = null;
            return;
        }

        if (previousBranchId && previousBranchId !== selectedBranchId) {
            setValue('category', '', { shouldValidate: false });
            clearErrors('category');
        }

        previousBranchIdRef.current = selectedBranchId;
    }, [clearErrors, selectedBranchId, setValue]);

    useEffect(() => {
        if (!selectedCategory?.trim()) return;
        clearErrors('category');
    }, [clearErrors, selectedCategory]);

    useEffect(() => {
        if (!canUseProtectedApis) {
            setCategories([]);
            setCategoryLoading(false);
            return;
        }

        if (!selectedBranchId) {
            setCategories([]);
            setCategoryLoading(false);
            return;
        }
        let active = true;
        setCategories([]);
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
    }, [canUseProtectedApis, selectedBranchId]);

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

    const isLightTheme = theme === 'light';
    const inputClassName = isLightTheme
        ? 'border-gray-300 bg-white text-black placeholder:text-black/70 focus:border-blue-500 focus:ring-blue-500/20'
        : undefined;
    const labelClassName = isLightTheme ? 'text-black' : undefined;
    const blackLabelClassName = 'menu-item-black-label text-center';
    const updateToppingRow = (id: string, field: 'name' | 'price', value: string) => {
        setToppingRows((previous) =>
            previous.map((row) => row.id === id ? { ...row, [field]: value } : row)
        );
        setToppingError(null);
    };

    const addToppingRow = () => {
        setToppingRows((previous) => [...previous, createToppingRow()]);
        setToppingError(null);
    };

    const removeToppingRow = (id: string) => {
        setToppingRows((previous) => previous.filter((row) => row.id !== id));
        setToppingError(null);
    };

    const sanitizeToppings = (): SanitizedToppingsPayload | null => {
        const normalizedRows = toppingRows.map((row) => ({
            toppingId: row.toppingId,
            name: row.name.trim(),
            price: row.price.trim(),
        }));
        const hasPartiallyFilledRow = normalizedRows.some(
            (row) => (row.name && !row.price) || (!row.name && row.price)
        );

        if (hasPartiallyFilledRow) {
            setToppingError('Each topping row needs both a name and a price.');
            return null;
        }

        const parsedRows = normalizedRows
            .filter((row) => row.name && row.price)
            .map((row) => ({
                toppingId: row.toppingId,
                name: row.name,
                price: Number(row.price),
            }));

        if (parsedRows.some((row) => !Number.isFinite(row.price) || row.price <= 0)) {
            setToppingError('Each topping price must be greater than 0.');
            return null;
        }

        setToppingError(null);
        const toppingIds = parsedRows.flatMap((row) => (row.toppingId ? [row.toppingId] : []));
        const newToppings = parsedRows.flatMap((row) =>
            row.toppingId ? [] : [{ name: row.name, price: row.price }]
        );
        const updatedToppings = parsedRows.flatMap((row) =>
            row.toppingId ? [{ id: row.toppingId, name: row.name, price: row.price }] : []
        );

        return {
            toppingIds,
            ...(newToppings.length > 0 ? { newToppings } : {}),
            ...(updatedToppings.length > 0 ? { updatedToppings } : {}),
        };
    };

    return (
        <form
            onSubmit={handleSubmit((data) => {
                const toppingPayload = showToppingsSection ? sanitizeToppings() : undefined;

                if (showToppingsSection && toppingPayload === null) {
                    return;
                }

                const payload: MenuItemFormData = {
                    ...data,
                    imageFile,
                    sharedBranchIds: isTransferable ? sharedBranchIds : [],
                    ...(showToppingsSection ? toppingPayload : {}),
                };

                return onSubmit(payload);
            })}
            className={cn(
                'space-y-4 sm:space-y-6',
                '[&_label.menu-item-black-label]:!text-black',
                isLightTheme
                    ? 'text-black'
                    : 'text-white [&_label]:!text-white [&_p]:!text-white [&_span]:!text-white'
            )}
        >
            <div className="space-y-4 sm:space-y-5">
                <Input
                    label="Item Name"
                    floatingLabel={!isLightTheme}
                    labelClassName={labelClassName}
                    className={inputClassName}
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="Cheeseburger"
                />

                <div className="w-full">
                    <label className={cn('block text-sm font-medium mb-1', isLightTheme ? 'text-black' : 'text-white')}>
                        Description
                    </label>
                    <textarea
                        {...register('description')}
                        className={cn(
                            'block w-full rounded-lg border px-3 py-2 shadow-sm transition-colors focus:outline-none focus:ring-2',
                            isLightTheme
                                ? 'border-gray-300 bg-white text-black placeholder:text-black/70 focus:border-blue-500 focus:ring-blue-500/20'
                                : 'border-gray-700 bg-gray-900/50 text-white placeholder-white/70 focus:border-purple-500 focus:ring-purple-500/20'
                        )}
                        rows={3}
                        placeholder="Delicious beef burger with cheese..."
                    />
                    {errors.description && (
                        <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                    )}
                </div>

                <Select
                    label="Branch"
                    labelClassName={labelClassName}
                    optionClassName={isLightTheme ? 'bg-white text-black' : undefined}
                    className={inputClassName}
                    {...register('branchId')}
                    value={selectedBranchId || ''}
                    error={errors.branchId?.message}
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
                    disabled={isManager}
                />
                {isManager && (
                    <p className={cn('text-xs mt-1', isLightTheme ? 'text-black' : 'text-amber-300')}>
                        Branch is locked to your assignment.
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                        label="Price"
                        floatingLabel={!isLightTheme}
                        labelClassName={cn(labelClassName, 'text-center')}
                        className={cn(inputClassName, 'no-number-spinner')}
                        type="number"
                        step="0.01"
                        {...register('price', { valueAsNumber: true })}
                        error={errors.price?.message}
                        placeholder="0.00"
                    />

                    <div className="w-full">
                        <Select
                            label="Category"
                            labelClassName={labelClassName}
                            optionClassName={isLightTheme ? 'bg-white text-black' : undefined}
                            className={inputClassName}
                            {...register('category')}
                            value={selectedCategory || ''}
                            error={errors.category?.message}
                            disabled={!selectedBranchId || categoryLoading || categoryOptions.length === 0}
                            description={
                                !selectedBranchId
                                    ? 'Select a branch first to set the category.'
                                    : categoryLoading
                                        ? 'Loading existing categories for this branch.'
                                        : categoryOptions.length > 0
                                            ? 'Choose an existing category for this branch.'
                                            : 'No categories found for this branch.'
                            }
                            descriptionClassName={isLightTheme ? 'text-black' : undefined}
                            options={
                                !selectedBranchId
                                    ? [{ value: '', label: 'Select branch first' }]
                                    : categoryLoading
                                        ? [{ value: '', label: 'Loading categories...' }]
                                        : categoryOptions.length > 0
                                            ? [
                                                { value: '', label: 'Select Category' },
                                                ...categoryOptions,
                                            ]
                                            : [{ value: '', label: 'No categories available' }]
                            }
                        />
                    </div>
                </div>

                {showToppingsSection && (
                    <div className={cn('rounded-2xl border p-4 sm:p-5', isLightTheme ? 'border-gray-200 bg-gray-50' : 'border-gray-700 bg-gray-900/30')}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h3 className={cn('text-sm font-semibold sm:text-base', isLightTheme ? 'text-black' : 'text-white')}>
                                    Toppings
                                </h3>
                                <p className={cn('mt-1 text-xs sm:text-sm', isLightTheme ? 'text-gray-600' : 'text-white opacity-80')}>
                                    Add topping options here. They will appear in the staff menu dropdown for this item.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={addToppingRow}
                                className={cn(
                                    'inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:text-sm',
                                    isLightTheme
                                        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                        : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                                )}
                            >
                                Add topping
                            </button>
                        </div>

                        {toppingRows.length === 0 ? (
                            <p className={cn('mt-4 text-xs sm:text-sm', isLightTheme ? 'text-gray-500' : 'text-white opacity-70')}>
                                No toppings added yet.
                            </p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {toppingRows.map((row, index) => (
                                    <div key={row.id} className="grid gap-3 rounded-xl border border-black/5 bg-white/70 p-3 md:grid-cols-[1fr_140px_auto]">
                                        <div>
                                            <label className={cn(blackLabelClassName, 'mb-1 block text-xs font-medium', isLightTheme ? 'text-black' : 'text-gray-900')}>
                                                Topping Name {index + 1}
                                            </label>
                                            <input
                                                type="text"
                                                value={row.name}
                                                onChange={(event) => updateToppingRow(row.id, 'name', event.target.value)}
                                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className={cn(blackLabelClassName, 'mb-1 block text-xs font-medium text-black')}>
                                                Price
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={row.price}
                                                onChange={(event) => updateToppingRow(row.id, 'price', event.target.value)}
                                                className="no-number-spinner block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                type="button"
                                                onClick={() => removeToppingRow(row.id)}
                                                className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-red-700 transition-colors hover:bg-red-50 md:w-auto"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {toppingError && (
                            <p className="mt-3 text-xs font-medium text-red-500">{toppingError}</p>
                        )}
                    </div>
                )}

                <div className="pt-2">
                    <Checkbox
                        label="Transferable to other branches"
                        labelClassName={cn('text-sm sm:text-base', labelClassName)}
                        className={isLightTheme ? 'border-gray-300 bg-white text-black focus:ring-blue-500/20' : undefined}
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
                    <p className={cn('mt-1 ml-6 sm:ml-7 text-xs sm:text-sm', isLightTheme ? 'text-black' : 'text-white opacity-80')}>
                        Enable this to share the item with selected branches in the same organization.
                    </p>
                </div>

                {isTransferable && (
                    <div className={cn('ml-2 grid gap-2 pl-4 sm:pl-7 border-l-2', isLightTheme ? 'border-gray-300' : 'border-gray-800')}>
                        {!selectedBranchId && (
                            <p className={cn('text-xs', isLightTheme ? 'text-black' : 'text-white')}>
                                Select a branch to choose sharing targets.
                            </p>
                        )}
                        {selectedBranchId && shareableBranches.length === 0 && (
                            <p className={cn('text-xs', isLightTheme ? 'text-black' : 'text-white')}>
                                No other branches available to share with.
                            </p>
                        )}
                        {selectedBranchId && shareableBranches.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {shareableBranches.map((branch) => {
                                    const checked = sharedBranchIds.includes(branch.id);
                                    return (
                                        <label
                                            key={branch.id}
                                            className={cn('flex items-center gap-2 text-sm', isLightTheme ? 'text-black' : 'text-white')}
                                        >
                                            <input
                                                type="checkbox"
                                                className={cn(
                                                    'h-4 w-4 rounded focus:ring-2 transition-colors cursor-pointer',
                                                    isLightTheme
                                                        ? 'border-gray-300 bg-white text-black focus:ring-blue-500/20'
                                                        : 'border-gray-700 bg-gray-900/50 text-purple-600 focus:ring-purple-500/20'
                                                )}
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
                            <p className={cn('text-xs', isLightTheme ? 'text-black' : 'text-amber-300')}>
                                Select at least one branch to enable sharing.
                            </p>
                        )}
                    </div>
                )}

                <div className="w-full">
                    <label className={cn('mb-1 block text-sm font-medium', isLightTheme ? 'text-black' : 'text-white')}>
                        Item Image (Optional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className={cn(
                            'block w-full rounded-lg border px-3 py-2 shadow-sm transition-colors file:mr-4 file:rounded file:border-0 file:px-3 file:py-1 file:text-sm file:font-medium focus:outline-none focus:ring-2',
                            isLightTheme
                                ? 'border-gray-300 bg-white text-black file:bg-gray-100 file:text-black hover:file:bg-gray-200 focus:border-blue-500 focus:ring-blue-500/20'
                                : 'border-gray-700 bg-gray-900/50 text-white file:bg-gray-700 file:text-white hover:file:bg-gray-600 focus:border-purple-500 focus:ring-purple-500/20'
                        )}
                    />
                    {initialData?.imageUrl && (
                        <p className={cn('mt-1 text-xs', isLightTheme ? 'text-black' : 'text-white')}>
                            Current image is set. Upload a new file to replace it.
                        </p>
                    )}
                </div>

                <div className="pt-2">
                    <Checkbox
                        label="Available"
                        labelClassName={labelClassName}
                        className={isLightTheme ? 'border-gray-300 bg-white text-black focus:ring-blue-500/20' : undefined}
                        {...register('available')}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth className="py-3 text-lg sm:text-base">
                    {isEdit ? 'Update Menu Item' : 'Create Menu Item'}
                </Button>
            </div>
        </form>
    );
}
