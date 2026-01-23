'use client';

import { useState, useEffect } from 'react';
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

    useEffect(() => {
        loadMenuItem();
    }, [id]);

    const loadMenuItem = async () => {
        try {
            setIsLoading(true);
            const data = await menuService.getMenuItem(id);
            setMenuItem(data);
        } catch (error) {
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
    };

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
            });

            setToast({
                message: 'Menu item updated successfully',
                type: 'success',
                isVisible: true,
            });

            setTimeout(() => {
                router.push('/admin/menu');
            }, 1000);
        } catch (error: any) {
            setToast({
                message: error.response?.data?.message || 'Failed to update menu item',
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
        <div className="max-w-2xl mx-auto">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Edit Menu Item</h1>
                    <p className="text-gray-400">Update item details</p>
                </div>
                <Link href="/admin/menu">
                    <Button variant="ghost">Back to List</Button>
                </Link>
            </div>

            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <MenuItemForm
                        initialData={menuItem}
                        onSubmit={handleSubmit}
                        isLoading={isSaving}
                        isEdit={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
