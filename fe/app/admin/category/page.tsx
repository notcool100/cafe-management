'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryService } from '@/lib/api/category-service';
import { branchService } from '@/lib/api/branch-service';
import { Branch, Category, UserRole } from '@/lib/types';
import { useAuthStore } from '@/lib/store/auth-store';
import CategoryForm, { CategoryFormData } from '@/components/admin/CategoryForm';
import Toast from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function CategoriesPage() {
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const managerBranchId = isManager ? user?.branchId : undefined;

    const [branches, setBranches] = useState<Branch[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeBranchId, setActiveBranchId] = useState(managerBranchId || '');
    const [editCategory, setEditCategory] = useState<Category | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<Category | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const effectiveBranchId = useMemo(
        () => managerBranchId || activeBranchId || undefined,
        [activeBranchId, managerBranchId]
    );

    const loadBranches = useCallback(async () => {
        try {
            const data = await branchService.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Failed to load branches:', error);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await categoryService.getCategories(effectiveBranchId);
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
            setToast({
                message: 'Failed to load categories',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [effectiveBranchId]);

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        if (managerBranchId) {
            setActiveBranchId(managerBranchId);
        } else if (!activeBranchId && branches.length === 1) {
            setActiveBranchId(branches[0].id);
        }
    }, [branches, activeBranchId, managerBranchId]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleCreate = async (data: CategoryFormData) => {
        try {
            setIsSaving(true);
            await categoryService.createCategory(data);
            setToast({
                message: 'Category created successfully',
                type: 'success',
                isVisible: true,
            });
            await loadCategories();
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to create category',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (data: CategoryFormData) => {
        if (!editCategory) return;
        try {
            setIsSaving(true);
            const updated = await categoryService.updateCategory(editCategory.id, data);
            setCategories((prev) => prev.map((cat) => (cat.id === updated.id ? updated : cat)));
            setEditCategory(null);
            setToast({
                message: 'Category updated successfully',
                type: 'success',
                isVisible: true,
            });
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to update category',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await categoryService.deleteCategory(deleteConfirm.id);
            setCategories((prev) => prev.filter((cat) => cat.id !== deleteConfirm.id));
            setDeleteConfirm(null);
            setToast({
                message: 'Category deleted successfully',
                type: 'success',
                isVisible: true,
            });
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to delete category',
                type: 'error',
                isVisible: true,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[70vh] bg-[#efe8cf] px-4 py-6">
                <div className="mx-auto max-w-6xl rounded-md border border-[#e3dcc4] bg-[#efe8cf] p-5">
                    <div className="flex h-64 items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] bg-[#efe8cf] px-4 py-6">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mx-auto max-w-6xl rounded-md border border-[#e3dcc4] bg-[#efe8cf] p-5">
                <div className="mb-6 flex flex-col gap-2">
                    <p className="text-xl font-semibold leading-tight text-[#1f1c17]">Menu Setup</p>
                    <h1 className="text-3xl font-bold leading-tight text-[#15120f]">Categories</h1>
                    <p className="text-sm text-[#6b5c4f]">
                        Create reusable categories per branch and share them across your organization.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.4fr] gap-6">
                    <div className="rounded-xl border border-[#d7c5a8] bg-[#f7efdf] p-5">
                        <h2 className="text-lg font-semibold text-[#3a261f] mb-4">Create Category</h2>
                        <CategoryForm onSubmit={handleCreate} isLoading={isSaving} />
                    </div>

                    <div className="rounded-xl border border-[#d7c5a8] bg-[#f7efdf] p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-[#3a261f]">Existing Categories</h2>
                                <p className="text-sm text-[#6b5c4f]">
                                    {categories.length} total
                                </p>
                            </div>
                            <div className="w-full sm:w-[220px]">
                                <label htmlFor="branch-filter" className="sr-only">Filter by branch</label>
                                <select
                                    id="branch-filter"
                                    value={activeBranchId}
                                    onChange={(e) => setActiveBranchId(e.target.value)}
                                    disabled={isManager}
                                    className="w-full rounded-lg border border-[#5b3629] bg-[#5b3629] px-3 py-2 text-sm font-medium text-[#f8efe1] outline-none disabled:cursor-not-allowed disabled:opacity-70"
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
                                                <option value="">All Branches</option>
                                                {branches.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.name}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                </select>
                            </div>
                        </div>

                        {categories.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#d7c5a8] bg-[#fffaf0] p-8 text-center text-[#6b5c4f]">
                                No categories found for this branch.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {categories.map((category) => {
                                    const isOwner = !isManager || category.branchId === managerBranchId;
                                    const isSharedFromOther =
                                        effectiveBranchId && category.branchId !== effectiveBranchId;
                                    const sharedCount = category.sharedBranchIds?.length || 0;

                                    return (
                                        <div
                                            key={category.id}
                                            className="rounded-lg border border-[#e0d0b7] bg-[#fffaf0] p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <p className="text-lg font-semibold text-[#2e1f18]">
                                                    {category.name}
                                                </p>
                                                <p className="text-xs text-[#7a6a5f]">
                                                    Owner: {category.branch?.name || 'Unknown branch'}
                                                </p>
                                                {isSharedFromOther && (
                                                    <p className="text-xs text-[#b45309]">
                                                        Shared from {category.branch?.name || 'another branch'}
                                                    </p>
                                                )}
                                                {!isSharedFromOther && sharedCount > 0 && (
                                                    <p className="text-xs text-[#6b5c4f]">
                                                        Shared with {sharedCount} branch{sharedCount === 1 ? '' : 'es'}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditCategory(category)}
                                                    disabled={!isOwner}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => setDeleteConfirm(category)}
                                                    disabled={!isOwner}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={editCategory !== null}
                onClose={() => setEditCategory(null)}
                title="Edit Category"
            >
                {editCategory && (
                    <CategoryForm
                        initialData={editCategory}
                        onSubmit={handleUpdate}
                        isLoading={isSaving}
                        isEdit
                    />
                )}
            </Modal>

            <Modal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Category"
            >
                <p className="mb-6 leading-relaxed text-gray-300">
                    Are you sure you want to delete the category "{deleteConfirm?.name}"? This will not remove existing
                    menu items but they may become harder to filter.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Delete Category
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
