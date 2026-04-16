'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { menuService } from '@/lib/api/menu-service';
import { MenuItem } from '@/lib/types';
import MenuItemForm, { MenuItemFormData } from '@/components/admin/MenuItemForm';
import Toast from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

export default function EditMenuItemPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
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

    useEffect(() => {
        setPreview(menuItem?.imageUrl || null);
    }, [menuItem?.imageUrl]);

    useEffect(() => {
        return () => {
            if (preview?.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

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
                toppingIds: data.toppingIds,
                newToppings: data.newToppings,
                updatedToppings: data.updatedToppings,
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
        <div className="min-h-screen bg-[#e7dcc5] flex flex-col items-center py-10 px-4">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <h1 className="text-2xl font-semibold mb-8 tracking-wide text-white">
                Edit Menu Item
            </h1>

            <div className="w-full max-w-5xl bg-[#8d776f] rounded-2xl shadow-xl border-4 border-[#3b82f6] overflow-hidden">
                <div className="flex flex-col md:grid md:grid-cols-2">
                    <div className="bg-[#d9d2c3] flex flex-col items-center justify-center p-6 md:p-8 order-1 md:order-2 border-b md:border-b-0 md:border-l border-gray-300">
                        <div className="w-full max-w-[280px] aspect-square bg-[#e8dccb] rounded-2xl shadow-md flex items-center justify-center overflow-hidden">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-black">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-sm font-medium">Image Preview</span>
                                </div>
                            )}
                        </div>

                        <p className="text-xs md:text-sm text-black mt-4 text-center">
                            Select an image from the form to see preview
                        </p>
                    </div>

                    <div className="p-6 md:p-8 bg-[#8d776f] text-white order-2 md:order-1 [&_label]:!text-white [&_p]:!text-white [&_span]:!text-white [&_h2]:!text-white">
                        <h2 className="text-lg text-white mb-6 font-medium">
                            Edit an item in the menu
                        </h2>

                        <MenuItemForm
                            key={menuItem.id}
                            initialData={menuItem}
                            onSubmit={handleSubmit}
                            isLoading={isSaving}
                            isEdit={true}
                            showToppingsSection={true}
                            onImagePreview={(file) => {
                                setPreview((currentPreview) => {
                                    if (currentPreview?.startsWith('blob:')) {
                                        URL.revokeObjectURL(currentPreview);
                                    }

                                    return file ? URL.createObjectURL(file) : (menuItem?.imageUrl || null);
                                });
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
