'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MenuItem, MenuCategory, Branch, CreateMenuItemData } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Checkbox from '@/components/ui/Checkbox';
import { useEffect, useState } from 'react';
import { branchService } from '@/lib/api/branch-service';

const menuItemSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    category: z.nativeEnum(MenuCategory),
    branchId: z.string().min(1, 'Branch is required'),
    available: z.boolean(),
});

export interface MenuItemFormData extends z.infer<typeof menuItemSchema> {
    imageFile?: File | null;
}

interface MenuItemFormProps {
    initialData?: MenuItem;
    onSubmit: (data: MenuItemFormData) => Promise<void>;
    isLoading: boolean;
    isEdit?: boolean;
}

export default function MenuItemForm({ initialData, onSubmit, isLoading, isEdit = false }: MenuItemFormProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<MenuItemFormData>({
        resolver: zodResolver(menuItemSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            price: initialData?.price || 0,
            category: initialData?.category || MenuCategory.FOOD,
            branchId: initialData?.branchId || '',
            available: initialData?.available ?? true,
        },
    });

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await branchService.getBranches();
                setBranches(data);
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        };
        loadBranches();
    }, []);

    return (
        <form
            onSubmit={handleSubmit((data) => onSubmit({ ...data, imageFile }))}
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
                    options={[
                        { value: '', label: 'Select Branch' },
                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                />

                <div className="w-full">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Item Image (Optional)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setImageFile(event.target.files?.[0] || null)}
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
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Menu Item' : 'Create Menu Item'}
                </Button>
            </div>
        </form>
    );
}
