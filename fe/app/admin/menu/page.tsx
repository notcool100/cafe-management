'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { menuService } from '@/lib/api/menu-service';
import { branchService } from '@/lib/api/branch-service';
import { MenuItem, MenuCategory, Branch, UserRole } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { resolveImageUrl } from '@/lib/utils/image';
import { useAuthStore } from '@/lib/store/auth-store';

export default function MenuPage() {
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const managerBranchId = isManager ? user?.branchId : undefined;
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: '',
        category: '' as MenuCategory | '',
        branchId: managerBranchId || '',
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [branchesData, itemsData] = await Promise.all([
                branchService.getBranches(),
                menuService.getMenuItems({})
            ]);
            setBranches(branchesData);
            setMenuItems(itemsData);

            // Auto-apply branch filter for managers or single-branch tenants
            if (managerBranchId) {
                setFilters((prev) => ({ ...prev, branchId: managerBranchId }));
            } else if (!managerBranchId && filters.branchId === '' && branchesData.length === 1) {
                setFilters((prev) => ({ ...prev, branchId: branchesData[0].id }));
            }
        } catch (error) {
            console.log('Failed to load data:', error);
            setToast({
                message: 'Failed to load menu data',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [filters.branchId, managerBranchId]);

    // Reload menu items when filters change (except search which is client-side filtered for responsiveness)
    const loadMenuItems = useCallback(async () => {
        try {
            // Only toggle loading if it takes a bit, but for now just simple state
            const items = await menuService.getMenuItems({
                category: filters.category || undefined,
                branchId: filters.branchId || undefined,
            });
            setMenuItems(items);
        } catch (error) {
            console.log('Failed to load items:', error);
        }
    }, [filters.branchId, filters.category]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        loadMenuItems();
    }, [loadMenuItems]);

    const handleDelete = async (id: string) => {
        try {
            await menuService.deleteMenuItem(id);
            setMenuItems(menuItems.filter(item => item.id !== id));
            setDeleteConfirm(null);
            setToast({
                message: 'Menu item deleted successfully',
                type: 'success',
                isVisible: true,
            });
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to delete item',
                type: 'error',
                isVisible: true,
            });
        }
    };

    const handleToggleAvailability = async (item: MenuItem) => {
        try {
            const updatedItem = await menuService.updateMenuItem(item.id, {
                available: !item.available
            });
            setMenuItems(menuItems.map(i => i.id === item.id ? updatedItem : i));
        } catch {
            setToast({
                message: 'Failed to update availability',
                type: 'error',
                isVisible: true,
            });
        }
    };

    const filteredItems = menuItems.filter(item =>
        item.name.toLowerCase().includes(filters.search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="rounded-xl border border-[#d7c5a8] bg-[#f7efdf] p-4 sm:p-6 lg:p-8">
                <h1 className="mb-6 text-2xl font-semibold text-[#5b3629] sm:mb-8 sm:text-3xl">MENU ITEAM</h1>
                <h2 className="mb-6 text-center text-2xl font-semibold tracking-wide text-[#20110b] sm:mb-8 sm:text-3xl">MENU</h2>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full sm:max-w-[260px]">
                        <label htmlFor="branch-filter" className="sr-only">Filter by branch</label>
                        <select
                            id="branch-filter"
                            value={filters.branchId}
                            onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                            disabled={isManager}
                            className="w-full rounded-lg border border-[#5b3629] bg-[#5b3629] px-4 py-2 text-lg font-medium text-[#f8efe1] outline-none disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isManager && managerBranchId
                                ? branches
                                    .filter((b) => b.id === managerBranchId)
                                    .map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))
                                : (
                                    <>
                                        <option value="">Branch</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </>
                                )}
                        </select>
                    </div>

                    <Link
                        href="/admin/menu/new"
                        className="inline-flex w-full items-center justify-center rounded-lg bg-[#5b3629] px-8 py-2 text-xl leading-none text-[#f8efe1] transition hover:bg-[#4c2c20] sm:w-auto sm:text-2xl"
                    >
                        Add item
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => {
                    const imageSrc = resolveImageUrl(item.imageUrl);

                    return (
                        <div key={item.id} className="rounded-xl bg-[#5b3629] p-4 shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                            <div className="relative h-36 w-full rounded-lg bg-[#cdcdcd] overflow-hidden">
                                {imageSrc ? (
                                    <Image
                                        src={imageSrc}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 25vw"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#808080]">
                                        <ImageIcon className="h-12 w-12" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant={item.available ? 'success' : 'danger'}>
                                        {item.available ? 'Available' : 'Unavailable'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="pt-4">
                                <h3 className="line-clamp-1 text-xl font-medium text-[#f9f0e2] sm:text-2xl" title={item.name}>
                                    {item.name}
                                </h3>
                                <p className="mt-1 text-base text-[#e9d8c5]">Rs. {Number(item.price).toFixed(2)}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link href={`/admin/menu/${item.id}`} className="rounded-md border border-[#d8c4aa] px-3 py-1 text-sm text-[#f9f0e2] hover:bg-[#744637]">
                                        Edit
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleAvailability(item)}
                                        className="rounded-md border border-[#d8c4aa] px-3 py-1 text-sm text-[#f9f0e2] hover:bg-[#744637]"
                                    >
                                        {item.available ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteConfirm(item.id)}
                                        className="rounded-md border border-[#f0b8ae] px-3 py-1 text-sm text-[#ffe1dc] hover:bg-[#7f3f34]"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredItems.length === 0 && (
                <div className="rounded-xl border border-[#d7c5a8] bg-[#f7efdf] py-12 text-center">
                    <p className="mb-4 text-[#6e4b3d]">No menu items found</p>
                    <Link
                        href="/admin/menu/new"
                        className="inline-flex items-center justify-center rounded-lg bg-[#5b3629] px-5 py-2 text-[#f8efe1] transition hover:bg-[#4c2c20]"
                    >
                        Add First Item
                    </Link>
                </div>
            )}

            <Modal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Menu Item"
            >
                <p className="text-gray-300 mb-6">
                    Are you sure you want to delete this menu item?
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-[#8f7668] px-4 py-2 text-[#f8efe1] hover:bg-[#674739]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                        className="rounded-lg bg-[#8a2f23] px-4 py-2 text-[#fff4f2] hover:bg-[#75261c]"
                    >
                        Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}
