'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { menuService } from '@/lib/api/menu-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import MenuItemForm, { MenuItemFormData } from '@/components/admin/MenuItemForm';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';

export default function NewMenuItemPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const handleSubmit = async (data: MenuItemFormData) => {
        try {
            setIsLoading(true);
            await menuService.createMenuItem({
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                branchId: data.branchId,
                imageFile: data.imageFile || null,
                available: data.available,
            });

            setToast({
                message: 'Menu item created successfully',
                type: 'success',
                isVisible: true,
            });

            setTimeout(() => {
                router.push('/admin/menu');
            }, 1000);
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to create menu item',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

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
                    <h1 className="text-3xl font-bold text-white mb-2">Add Menu Item</h1>
                    <p className="text-gray-400">Create a new dish or beverage</p>
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
                    <MenuItemForm onSubmit={handleSubmit} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    );
}
