import { MenuItem } from '../types';

type MenuItemBranchConfig = Pick<MenuItem, 'available' | 'branchId' | 'sharedBranchIds' | 'disabledBranchIds'>;

export const getMenuItemVisibleBranchIds = (item: Pick<MenuItem, 'branchId' | 'sharedBranchIds'>) =>
    Array.from(new Set([item.branchId, ...(item.sharedBranchIds || [])].filter(Boolean)));

export const isMenuItemDisabledForBranch = (item: Pick<MenuItem, 'disabledBranchIds'>, branchId?: string | null) =>
    Boolean(branchId && (item.disabledBranchIds || []).includes(branchId));

export const isMenuItemAvailableForBranch = (item: MenuItemBranchConfig, branchId?: string | null) =>
    item.available !== false && !isMenuItemDisabledForBranch(item, branchId);
