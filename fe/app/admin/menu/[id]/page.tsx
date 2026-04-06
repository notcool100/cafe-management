'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { menuService } from '@/lib/api/menu-service';
import { MenuItem } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import MenuItemForm, { MenuItemFormData } from '@/components/admin/MenuItemForm';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

export default function EditMenuItemPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const loadMenuItem = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await menuService.getMenuItem(id);
            setMenuItem(data);
        } catch {
            setToast({
                message: 'Failed to load menu item',
                type: 'error',
                isVisible: true,
            });
            setTimeout(() => {
                router.push('/admin/menu');
            }, 2000);
        } finally {
            setIsLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        loadMenuItem();
    }, [loadMenuItem]);

    const handleSubmit = async (data: MenuItemFormData) => {
        try {
            setIsSaving(true);
            await menuService.updateMenuItem(id, {
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                branchId: data.branchId,
                imageFile: data.imageFile || null,
                available: data.available,
                sharedBranchIds: data.sharedBranchIds,
            });

            setToast({
                message: 'Menu item updated successfully',
                type: 'success',
                isVisible: true,
            });

            setTimeout(() => {
                router.push('/admin/menu');
            }, 1000);
        } catch (error: unknown) {
            const message =
                (error as { message?: string })?.message ||
                (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error ||
                (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to update menu item',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!menuItem) return null;

    return (
        <div className="max-w-2xl mx-auto text-black px-4 sm:px-0 pb-10">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1">Edit Menu Item</h1>
                    <p className="text-sm text-gray-600">Update item details</p>
                </div>
                <Link href="/admin/menu" className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto" variant="outline">Back to List</Button>
                </Link>
            </div>

            <Card variant="glass" className="!bg-white !border-gray-200 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-black">Item Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <MenuItemForm
                        initialData={menuItem}
                        onSubmit={handleSubmit}
                        isLoading={isSaving}
                        isEdit={true}
                        theme="light"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
