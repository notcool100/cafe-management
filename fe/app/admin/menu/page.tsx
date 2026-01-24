'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { menuService } from '@/lib/api/menu-service';
import { branchService } from '@/lib/api/branch-service';
import { MenuItem, MenuCategory, Branch } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { resolveImageUrl } from '@/lib/utils/image';

export default function MenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        search: '',
        category: '' as MenuCategory | '',
        branchId: '',
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    useEffect(() => {
        loadData();
    }, []);

    // Reload menu items when filters change (except search which is client-side filtered for responsiveness, 
    // or we could debounce it. Here for simplicity I'll fetch all and filter client side unless the dataset is expected to be huge)
    // Actually the service supports filtering, let's use it properly.
    useEffect(() => {
        loadMenuItems();
    }, [filters.category, filters.branchId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [branchesData, itemsData] = await Promise.all([
                branchService.getBranches(),
                menuService.getMenuItems({})
            ]);
            setBranches(branchesData);
            setMenuItems(itemsData);
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
    };

    const loadMenuItems = async () => {
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
    };

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
        } catch (error: any) {
            setToast({
                message: error.response?.data?.message || 'Failed to delete item',
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
        } catch (error) {
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
        <div>
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Menu Items</h1>
                <p className="text-gray-400">Manage food and beverage offerings</p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="md:col-span-2">
                    <Input
                        placeholder="Search items..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        className="w-full"
                    />
                </div>
                <Select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value as MenuCategory })}
                    options={[
                        { value: '', label: 'All Categories' },
                        ...Object.values(MenuCategory).map(cat => ({
                            value: cat,
                            label: cat.charAt(0) + cat.slice(1).toLowerCase().replace('_', ' ')
                        }))
                    ]}
                    className="w-full"
                />
                <Select
                    value={filters.branchId}
                    onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                    options={[
                        { value: '', label: 'All Branches' },
                        ...branches.map(b => ({ value: b.id, label: b.name }))
                    ]}
                    className="w-full"
                />
            </div>

            <div className="flex justify-end mb-6">
                <Link href="/admin/menu/new">
                    <Button>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Menu Item
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                    <Card key={item.id} variant="glass" hover className="flex flex-col h-full">
                        <div className="relative h-48 w-full bg-gray-800 rounded-t-xl overflow-hidden">
                            {resolveImageUrl(item.imageUrl) ? (
                                <img
                                    src={resolveImageUrl(item.imageUrl)}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    <ImageIcon className="h-12 w-12" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2">
                                <Badge variant={item.available ? 'success' : 'danger'}>
                                    {item.available ? 'Available' : 'Unavailable'}
                                </Badge>
                            </div>
                        </div>

                        <CardContent className="flex-1 flex flex-col p-4">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-white text-lg line-clamp-1" title={item.name}>
                                    {item.name}
                                </h3>
                                <span className="font-bold text-purple-400">
                                    ${Number(item.price).toFixed(2)}
                                </span>
                            </div>

                            <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                                {item.description || 'No description available'}
                            </p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <Badge variant="default" size="sm">
                                    {item.category.replace('_', ' ')}
                                </Badge>
                                {item.branch && (
                                    <Badge variant="info" size="sm">
                                        {item.branch.name}
                                    </Badge>
                                )}
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleAvailability(item)}
                                    className={item.available ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}
                                >
                                    {item.available ? 'Disable' : 'Enable'}
                                </Button>
                                <Link href={`/admin/menu/${item.id}`} className="flex-1">
                                    <Button variant="outline" size="sm" fullWidth>
                                        Edit
                                    </Button>
                                </Link>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setDeleteConfirm(item.id)}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredItems.length === 0 && (
                <Card variant="glass">
                    <CardContent className="py-12 text-center">
                        <p className="text-gray-400 mb-4">No menu items found</p>
                        <Link href="/admin/menu/new">
                            <Button>Add First Item</Button>
                        </Link>
                    </CardContent>
                </Card>
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
                    <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                    >
                        Delete
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}
