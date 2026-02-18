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
            });

            setToast({
                message: 'Menu item created successfully',
                type: 'success',
                isVisible: true,
            });

            setTimeout(() => {
                router.push('/admin/menu');
            }, 1000);
        } catch (error: any) {
            setToast({
                message:
                    error?.response?.data?.message ||
                    'Failed to create menu item',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#e7dcc5] flex flex-col items-center py-10 px-4">

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() =>
                    setToast({ ...toast, isVisible: false })
                }
            />

            <h1 className="text-2xl font-semibold mb-8 tracking-wide">
                MENU
            </h1>

            <div className="w-full max-w-5xl bg-[#8d776f] rounded-2xl shadow-xl border-4 border-blue-500 overflow-hidden">
                <div className="grid md:grid-cols-2">

                    {/* LEFT SIDE FORM */}
                    <div className="p-8 bg-[#8d776f]">
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
                    <div className="bg-[#d9d2c3] flex flex-col items-center justify-center p-8">

                        <div className="w-64 h-64 bg-[#e8dccb] rounded-2xl shadow-md flex items-center justify-center overflow-hidden">
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
