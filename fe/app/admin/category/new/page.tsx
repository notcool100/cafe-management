'use client';

import { useState } from 'react';
import { MenuItemFormData } from '@/components/admin/MenuItemFormTypes';
import Button from '@/components/ui/Button';

interface MenuItemFormProps {
    onSubmit: (data: MenuItemFormData) => void;
    isLoading: boolean;
}

export default function MenuItemForm({ onSubmit, isLoading }: MenuItemFormProps) {
    const [formData, setFormData] = useState<MenuItemFormData>({
        name: '',
        description: '',
        price: 0,
        category: 'Food', // default
        branchId: '',
        imageFile: null,
        available: true,
    });

    const categories = [
        'Food',
        'Beverage',
        'Dessert',
        'Appetizer',
        'Main Course',
        'Snack',
    ];

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const target = e.target;
        const { name } = target;

        if (target instanceof HTMLInputElement) {
            const { type, value, checked, files } = target;
            setFormData(prev => ({
                ...prev,
                [name]:
                    type === 'checkbox'
                        ? checked
                        : type === 'file'
                            ? files?.[0] || null
                            : value,
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            [name]: target.value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Item Name */}
            <div>
                <label className="block text-sm font-medium text-gray-200">Item Name</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-200">Description</label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    rows={3}
                />
            </div>

            {/* Price and Branch */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-200">Price</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-200">Branch</label>
                    <select
                        name="branchId"
                        value={formData.branchId}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">Select Branch</option>
                        {/* Populate branch options dynamically */}
                    </select>
                </div>
            </div>

            {/* Category as Radio Buttons */}
            <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Category</label>
                <div className="flex flex-wrap gap-4">
                    {categories.map(cat => (
                        <label key={cat} className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="category"
                                value={cat}
                                checked={formData.category === cat}
                                onChange={handleChange}
                                className="rounded border-gray-300"
                            />
                            <span className="text-gray-200">{cat}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Image Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-200">Item Image (Optional)</label>
                <input
                    type="file"
                    name="imageFile"
                    onChange={handleChange}
                    className="mt-1 block w-full text-gray-200"
                />
            </div>

            {/* Available Checkbox */}
            <div className="flex items-center">
                <input
                    type="checkbox"
                    name="available"
                    checked={formData.available}
                    onChange={handleChange}
                    className="mr-2"
                />
                <span className="text-gray-200">Available</span>
            </div>

            {/* Submit Button */}
            <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Menu Item'}
            </Button>
        </form>
    );
}
