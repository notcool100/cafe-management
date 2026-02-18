'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { menuService } from '@/lib/api/menu-service';
import MenuItemForm, { MenuItemFormData } from '@/components/admin/MenuItemForm';
import Toast from '@/components/ui/Toast';

export default function NewMenuItemPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'error';
        isVisible: boolean;
    }>({
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
                isTransferable: data.isTransferable,
                borrowedByBranchIds: data.borrowedByBranchIds,
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
            setToast({
                message:
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    'Failed to create menu item',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#e7dcc5] flex flex-col items-center px-4 py-6 sm:py-10">

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() =>
                    setToast({ ...toast, isVisible: false })
                }
            />

            <h1 className="mb-6 text-2xl font-semibold tracking-wide sm:mb-8">
                MENU
            </h1>

            <div className="w-full max-w-5xl bg-[#8d776f] rounded-2xl shadow-xl border-4 border-blue-500 overflow-hidden">
                <div className="grid md:grid-cols-2">

                    {/* LEFT SIDE FORM */}
                    <div className="bg-[#8d776f] p-5 sm:p-8">
                        <h2 className="text-lg text-white mb-6">
                            Add an item to the menu
                        </h2>

                        <MenuItemForm
                            onSubmit={handleSubmit}
                            isLoading={isLoading}
                            onImagePreview={(file) => {
                                if (file) {
                                    setPreview(URL.createObjectURL(file));
                                }
                            }}
                        />
                    </div>

                    {/* RIGHT SIDE IMAGE PREVIEW */}
                    <div className="bg-[#d9d2c3] flex flex-col items-center justify-center p-5 sm:p-8">

                        <div className="h-52 w-full max-w-xs rounded-2xl bg-[#e8dccb] shadow-md flex items-center justify-center overflow-hidden sm:h-64 sm:w-64">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt="Preview"
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <span className="text-gray-500">
                                    Image Preview
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-gray-600 mt-4">
                            Select an image from the form
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
