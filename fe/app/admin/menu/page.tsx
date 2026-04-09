'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { menuService } from '@/lib/api/menu-service';
import { branchService } from '@/lib/api/branch-service';
import { MenuItem, Branch } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import { resolveImageUrl } from '@/lib/utils/image';
import { useAuthStore } from '@/lib/store/auth-store';
import { formatBranchLabel } from '@/lib/utils/format';
import { getMenuItemVisibleBranchIds, isMenuItemDisabledForBranch } from '@/lib/utils/menu';

const MENU_PAGE_SIZE = 16;

export default function MenuPage() {
    const { selectedBranchId } = useAuthStore();
    const currentBranchId = selectedBranchId || '';
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoadingBranches, setIsLoadingBranches] = useState(true);
    const [isLoadingItems, setIsLoadingItems] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [availabilityTargetId, setAvailabilityTargetId] = useState<string | null>(null);
    const [pendingDisabledBranchIds, setPendingDisabledBranchIds] = useState<string[]>([]);
    const [isSavingDisabledBranches, setIsSavingDisabledBranches] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [menuTotalItems, setMenuTotalItems] = useState(0);
    const [menuTotalPages, setMenuTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        branchId: currentBranchId,
    });
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });
    const isLoading = isLoadingBranches || isLoadingItems;

    const loadBranches = useCallback(async () => {
        try {
            setIsLoadingBranches(true);
            const branchesData = await branchService.getBranches();
            setBranches(branchesData);

            // Auto-apply branch filter for managers or single-branch tenants
            if (currentBranchId) {
                setFilters((prev) => ({ ...prev, branchId: currentBranchId }));
            } else if (!currentBranchId && filters.branchId === '' && branchesData.length === 1) {
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
            setIsLoadingBranches(false);
        }
    }, [filters.branchId, currentBranchId]);

    const loadMenuItems = useCallback(async () => {
        try {
            setIsLoadingItems(true);
            const response = await menuService.getMenuItemsPage({
                search: filters.search || undefined,
                category: filters.category || undefined,
                branchId: filters.branchId || undefined,
                page: currentPage,
                limit: MENU_PAGE_SIZE,
            });
            setMenuItems(response.items);
            setMenuTotalItems(response.total);
            setMenuTotalPages(response.totalPages);
            if (response.page !== currentPage) {
                setCurrentPage(response.page);
            }
        } catch (error) {
            console.log('Failed to load items:', error);
        } finally {
            setIsLoadingItems(false);
        }
    }, [currentPage, filters.branchId, filters.category, filters.search]);

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [currentPage, filters.branchId, filters.category, filters.search]);

    useEffect(() => {
        loadMenuItems();
    }, [loadMenuItems]);

    const handleDelete = async (id: string) => {
        try {
            await menuService.deleteMenuItem(id);
            setDeleteConfirm(null);
            if (menuItems.length === 1 && currentPage > 1) {
                setCurrentPage((previousPage) => previousPage - 1);
            } else {
                await loadMenuItems();
            }
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

    const handleEnableItem = async (item: MenuItem) => {
        try {
            const updatedItem = await menuService.updateMenuItem(item.id, {
                available: true
            });
            setMenuItems((previous) => previous.map((currentItem) => currentItem.id === item.id ? updatedItem : currentItem));
            setToast({
                message: 'Menu item enabled successfully',
                type: 'success',
                isVisible: true,
            });
        } catch {
            setToast({
                message: 'Failed to update availability',
                type: 'error',
                isVisible: true,
            });
        }
    };

    const activeBranchId = filters.branchId || currentBranchId || (branches.length === 1 ? branches[0].id : '');

    const getVisibleBranchesForItem = useCallback((item: MenuItem) => {
        const visibleBranchIds = getMenuItemVisibleBranchIds(item);
        return visibleBranchIds
            .map((branchId) => branches.find((branch) => branch.id === branchId))
            .filter((branch): branch is Branch => Boolean(branch));
    }, [branches]);

    const getDisabledBranchesForItem = useCallback((item: MenuItem) => {
        const disabledBranchIdSet = new Set(item.disabledBranchIds || []);
        return getVisibleBranchesForItem(item).filter((branch) => disabledBranchIdSet.has(branch.id));
    }, [getVisibleBranchesForItem]);

    const availabilityTarget = useMemo(
        () => menuItems.find((item) => item.id === availabilityTargetId) || null,
        [availabilityTargetId, menuItems]
    );
    const availabilityTargetBranches = availabilityTarget ? getVisibleBranchesForItem(availabilityTarget) : [];

    const openAvailabilityModal = (item: MenuItem) => {
        setAvailabilityTargetId(item.id);
        setPendingDisabledBranchIds(item.disabledBranchIds || []);
    };

    const closeAvailabilityModal = () => {
        if (isSavingDisabledBranches) return;
        setAvailabilityTargetId(null);
        setPendingDisabledBranchIds([]);
    };

    const handleToggleBranchDisabled = (branchId: string) => {
        setPendingDisabledBranchIds((previous) =>
            previous.includes(branchId)
                ? previous.filter((id) => id !== branchId)
                : [...previous, branchId]
        );
    };

    const handleSaveDisabledBranches = async () => {
        if (!availabilityTarget) {
            return;
        }

        try {
            setIsSavingDisabledBranches(true);
            const updatedItem = await menuService.updateMenuItem(availabilityTarget.id, {
                disabledBranchIds: pendingDisabledBranchIds,
            });
            setMenuItems((previous) =>
                previous.map((item) => item.id === updatedItem.id ? updatedItem : item)
            );
            closeAvailabilityModal();
            setToast({
                message: pendingDisabledBranchIds.length > 0
                    ? 'Branch availability updated'
                    : 'Item is now available in all assigned branches',
                type: 'success',
                isVisible: true,
            });
        } catch {
            setToast({
                message: 'Failed to update branch availability',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsSavingDisabledBranches(false);
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

            <div className="mb-8 rounded-xl border border-[#d7c5a8] bg-[#f7efdf] p-4 sm:p-6 lg:p-8">
                {/* <h1 className="text-3xl font-semibold text-[#5b3629] mb-8">MENU ITEAM</h1> */}
                <h2 className="mb-6 text-center text-2xl font-semibold tracking-wide text-[#20110b] sm:mb-8 sm:text-3xl">MENU</h2>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* <div className="w-full sm:max-w-[260px]">
                        <label htmlFor="branch-filter" className="sr-only">Filter by branch</label>
                        <select
                            id="branch-filter"
                            value={filters.branchId}
                            onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
                            disabled={isManager}
                            className="w-full rounded-lg border border-[#5b3629] bg-[#5b3629] px-4 py-2 text-lg font-medium text-[#f8efe1] outline-none disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isManager && currentBranchId
                                ? branches
                                    .filter((b) => b.id === currentBranchId)
                                    .map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {formatBranchLabel(b)}
                                        </option>
                                    ))
                                : (
                                    <>
                                        <option value="">Branch</option>
                                        {branches.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {formatBranchLabel(b)}
                                            </option>
                                        ))}
                                    </>
                                )}
                        </select>
                    </div> */}

                    <Link
                        href="/admin/menu/new"
                        className="inline-flex items-center justify-center rounded-lg bg-[#5b3629] px-5 py-2 text-xl leading-none text-[#f8efe1] transition hover:bg-[#4c2c20] sm:px-8 sm:text-3xl"
                    >
                        Add item
                    </Link>
                </div>
            </div>

            {menuTotalItems > 0 && (
                <div className="mb-4 flex flex-col gap-2 text-sm text-[#6e4b3d] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        Showing page {currentPage} of {menuTotalPages} ({menuTotalItems} items)
                    </p>
                    <p>
                        {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'} on this page
                    </p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2 sm:gap-6 md:grid-cols-3 xl:grid-cols-4">
                {filteredItems.map((item) => {
                    const imageSrc = resolveImageUrl(item.imageUrl);
                    const sourceBranch = item.branch || branches.find((branch) => branch.id === item.branchId);
                    const isFromOtherBranch = Boolean(activeBranchId && item.branchId && item.branchId !== activeBranchId);
                    const sourceBranchLabel = sourceBranch ? formatBranchLabel(sourceBranch) : 'Another branch';
                    const disabledBranches = getDisabledBranchesForItem(item);
                    const disabledBranchLabels = disabledBranches.map((branch) => formatBranchLabel(branch));
                    const isDisabledInActiveBranch = isMenuItemDisabledForBranch(item, activeBranchId);
                    const badge = !item.available
                        ? { variant: 'danger' as const, label: 'Unavailable' }
                        : disabledBranches.length === 0
                            ? { variant: 'success' as const, label: 'Available' }
                            : disabledBranches.length === getVisibleBranchesForItem(item).length
                                ? { variant: 'warning' as const, label: 'Disabled in all' }
                                : isDisabledInActiveBranch
                                    ? { variant: 'warning' as const, label: 'Disabled here' }
                                    : { variant: 'warning' as const, label: `Disabled in ${disabledBranches.length}` };

                    return (
                        <div key={item.id} className="rounded-xl bg-[#5b3629] p-3 shadow-[0_4px_10px_rgba(0,0,0,0.2)] sm:p-4">
                            <div className="relative h-32 w-full overflow-hidden rounded-lg bg-[#cdcdcd] sm:h-36">
                                {imageSrc ? (
                                    <Image
                                        src={imageSrc}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 1024px) 100vw, 25vw"
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#808080]">
                                        <ImageIcon className="h-12 w-12" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge variant={badge.variant}>
                                        {badge.label}
                                    </Badge>
                                </div>
                            </div>

                            <div className="pt-4">
                                <h3 className="break-words text-xl font-medium leading-tight text-[#f9f0e2] sm:text-2xl xl:text-3xl" title={item.name}>
                                    {item.name}
                                </h3>
                                {isFromOtherBranch && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-[#f3ddad] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5b3629]">
                                            From other branch
                                        </span>
                                        <span className="text-xs font-medium text-[#f3ddad]">
                                            {sourceBranchLabel}
                                        </span>
                                    </div>
                                )}
                                <p className="mt-1 text-base text-[#e9d8c5]">Rs. {Number(item.price).toFixed(2)}</p>
                                {item.available && disabledBranchLabels.length > 0 && (
                                    <p className="mt-2 text-xs leading-relaxed text-[#f3ddad]">
                                        Disabled in: {disabledBranchLabels.join(', ')}
                                    </p>
                                )}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link href={`/admin/menu/${item.id}`} className="rounded-md border border-[#d8c4aa] px-3 py-1 text-sm text-[#f9f0e2] hover:bg-[#744637]">
                                        Edit
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => item.available ? openAvailabilityModal(item) : handleEnableItem(item)}
                                        className="rounded-md border border-[#d8c4aa] px-3 py-1 text-sm text-[#f9f0e2] hover:bg-[#744637]"
                                    >
                                        {item.available ? 'Disable Branches' : 'Enable'}
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

            {menuTotalItems > 0 && (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[#6e4b3d]">
                        Page {currentPage} of {menuTotalPages}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((previousPage) => Math.max(previousPage - 1, 1))}
                            disabled={currentPage === 1 || isLoadingItems}
                            className="rounded-lg border border-[#d8c4aa] px-4 py-2 text-sm text-[#5b3629] transition hover:bg-[#f7efdf] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((previousPage) => Math.min(previousPage + 1, menuTotalPages))}
                            disabled={currentPage >= menuTotalPages || isLoadingItems}
                            className="rounded-lg bg-[#5b3629] px-4 py-2 text-sm text-[#f8efe1] transition hover:bg-[#4c2c20] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <Modal
                isOpen={availabilityTarget !== null}
                onClose={closeAvailabilityModal}
                title="Disable Branches"
                theme="light"
            >
                {availabilityTarget && (
                    <div className="space-y-5 text-gray-900">
                        <div>
                            <p className="text-sm font-medium">
                                Choose which branches should hide <span className="font-semibold">{availabilityTarget.name}</span>.
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                                The home branch and any shared branches can be disabled independently.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setPendingDisabledBranchIds(availabilityTargetBranches.map((branch) => branch.id))}
                                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                                Select all
                            </button>
                            <button
                                type="button"
                                onClick={() => setPendingDisabledBranchIds([])}
                                className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                                Clear all
                            </button>
                        </div>

                        <div className="grid gap-2">
                            {availabilityTargetBranches.map((branch) => {
                                const checked = pendingDisabledBranchIds.includes(branch.id);

                                return (
                                    <label
                                        key={branch.id}
                                        className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 transition hover:border-gray-300 hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleToggleBranchDisabled(branch.id)}
                                            className="h-4 w-4 rounded border-gray-300 text-[#5b3629] focus:ring-[#5b3629]"
                                        />
                                        <span>{formatBranchLabel(branch)}</span>
                                    </label>
                                );
                            })}
                        </div>

                        <p className="text-xs text-gray-500">
                            No branches selected means the item stays available everywhere it is assigned.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeAvailabilityModal}
                                disabled={isSavingDisabledBranches}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDisabledBranches}
                                disabled={isSavingDisabledBranches}
                                className="rounded-lg bg-[#5b3629] px-4 py-2 text-[#f8efe1] transition hover:bg-[#4c2c20] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSavingDisabledBranches ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

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
