import prisma from '../../config/database';
import { assertMenuItemEntitlement } from '../../utils/entitlements';

type MenuItemMutationInput = {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string;
    isAvailable?: boolean;
    isTransferable?: boolean;
    borrowedByBranchIds?: string[];
    branchId?: string;
};

const menuItemInclude = {
    branch: true,
    borrowedByBranches: {
        include: {
            targetBranch: true,
        },
    },
};

const branchMenuScope = (branchId: string) => ({
    OR: [
        { branchId },
        {
            borrowedByBranches: {
                some: { targetBranchId: branchId },
            },
        },
        {
            // Transferable items can be borrowed by other branches during ordering.
            isTransferable: true,
            branchId: { not: branchId },
        },
    ],
});

const normalizeBranchIds = (branchIds?: string[]) =>
    Array.from(new Set((branchIds || []).map((id) => String(id).trim()).filter(Boolean)));

const resolveBorrowedBranchIds = (
    branchIds: string[] | undefined,
    isTransferable: boolean,
    ownerBranchId: string
) => {
    if (!isTransferable) {
        return [];
    }

    return normalizeBranchIds(branchIds).filter((id) => id !== ownerBranchId);
};

const assertBorrowBranchesBelongToTenant = async (
    targetBranchIds: string[],
    tenantId: string
) => {
    if (targetBranchIds.length === 0) {
        return;
    }

    const branches = await prisma.branch.findMany({
        where: {
            id: { in: targetBranchIds },
            tenantId,
            isActive: true,
        },
        select: { id: true },
    });

    if (branches.length !== targetBranchIds.length) {
        throw new Error('One or more target branches are invalid for this tenant');
    }
};

export class MenuService {
    static async createMenuItem(
        data: {
            name: string;
            description?: string;
            price: number;
            category?: string;
            imageUrl?: string;
            branchId: string;
            isTransferable?: boolean;
            borrowedByBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const branch = await prisma.branch.findFirst({
            where: { id: data.branchId, ...(tenantId ? { tenantId } : {}) },
            select: { id: true, tenantId: true, isActive: true },
        });

        if (!branch || !branch.isActive) {
            throw new Error('Branch not found for this tenant');
        }

        await assertMenuItemEntitlement(branch.tenantId);

        const isTransferable = Boolean(data.isTransferable);
        const borrowedByBranchIds = resolveBorrowedBranchIds(
            data.borrowedByBranchIds,
            isTransferable,
            branch.id
        );

        await assertBorrowBranchesBelongToTenant(borrowedByBranchIds, branch.tenantId);

        const menuItem = await prisma.menuItem.create({
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                imageUrl: data.imageUrl,
                branchId: data.branchId,
                tenantId: branch.tenantId,
                isTransferable,
                borrowedByBranches: borrowedByBranchIds.length
                    ? {
                        create: borrowedByBranchIds.map((targetBranchId) => ({
                            targetBranchId,
                            tenantId: branch.tenantId,
                        })),
                    }
                    : undefined,
            },
            include: menuItemInclude,
        });

        return normalizeMenuItem(menuItem);
    }

    static async listMenuItems(
        branchId?: string,
        category?: string,
        tenantId?: string,
        available?: boolean
    ) {
        const menuItems = await prisma.menuItem.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                ...(category && { category }),
                ...(available !== undefined ? { isAvailable: available } : {}),
                ...(branchId ? branchMenuScope(branchId) : {}),
            },
            include: menuItemInclude,
            orderBy: { createdAt: 'desc' },
        });

        return menuItems.map((menuItem) => normalizeMenuItem(menuItem));
    }

    static async getMenuItem(id: string, tenantId?: string) {
        const menuItem = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: menuItemInclude,
        });

        if (!menuItem) {
            throw new Error('Menu item not found');
        }

        return normalizeMenuItem(menuItem);
    }

    static async updateMenuItem(
        id: string,
        data: MenuItemMutationInput,
        tenantId?: string
    ) {
        const existing = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: { borrowedByBranches: true },
        });

        if (!existing) {
            throw new Error('Menu item not found');
        }

        const isTransferable = data.isTransferable ?? existing.isTransferable;
        const shouldSyncBorrowed =
            data.isTransferable !== undefined || data.borrowedByBranchIds !== undefined;

        const borrowedByBranchIds = shouldSyncBorrowed
            ? resolveBorrowedBranchIds(
                data.borrowedByBranchIds ?? existing.borrowedByBranches.map((item) => item.targetBranchId),
                isTransferable,
                existing.branchId
            )
            : [];

        if (shouldSyncBorrowed) {
            await assertBorrowBranchesBelongToTenant(borrowedByBranchIds, existing.tenantId);
        }

        await prisma.$transaction(async (tx) => {
            await tx.menuItem.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description,
                    price: data.price,
                    category: data.category,
                    imageUrl: data.imageUrl,
                    isAvailable: data.isAvailable,
                    isTransferable: data.isTransferable,
                },
            });

            if (!shouldSyncBorrowed) {
                return;
            }

            await tx.menuItemBorrow.deleteMany({
                where: { menuItemId: id },
            });

            if (borrowedByBranchIds.length === 0) {
                return;
            }

            await tx.menuItemBorrow.createMany({
                data: borrowedByBranchIds.map((targetBranchId) => ({
                    menuItemId: id,
                    targetBranchId,
                    tenantId: existing.tenantId,
                })),
            });
        });

        const menuItem = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: menuItemInclude,
        });

        if (!menuItem) {
            throw new Error('Menu item not found');
        }

        return normalizeMenuItem(menuItem);
    }

    static async deleteMenuItem(id: string, tenantId?: string) {
        const existing = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: { id: true },
        });

        if (!existing) {
            throw new Error('Menu item not found');
        }

        await prisma.menuItem.delete({
            where: { id },
        });

        return { message: 'Menu item deleted successfully' };
    }

    // Public endpoint for customer menu
    static async getMenuForBranch(branchId: string) {
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
        });

        if (!branch) {
            throw new Error('Branch not found');
        }

        const menuItems = await prisma.menuItem.findMany({
            where: {
                tenantId: branch.tenantId,
                isAvailable: true,
                ...branchMenuScope(branchId),
            },
            include: menuItemInclude,
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        return {
            branch: {
                id: branch.id,
                name: branch.name,
                location: branch.location,
            },
            menuItems: menuItems.map((menuItem) =>
                normalizeMenuItem(menuItem, { requestedBranchId: branchId })
            ),
        };
    }
}

const normalizeMenuItem = (
    menuItem: any,
    options?: { requestedBranchId?: string }
) => {
    const borrowedByBranches = (menuItem.borrowedByBranches || []).map((borrow: any) => ({
        id: borrow.targetBranch?.id || borrow.targetBranchId,
        name: borrow.targetBranch?.name,
        location: borrow.targetBranch?.location,
    }));

    const borrowedByBranchIds = borrowedByBranches.map((branch: any) => branch.id);
    const isBorrowedForRequestedBranch = Boolean(
        options?.requestedBranchId &&
            menuItem.branchId !== options.requestedBranchId &&
            (
                borrowedByBranchIds.includes(options.requestedBranchId) ||
                menuItem.isTransferable
            )
    );

    return {
        ...menuItem,
        available: menuItem.isAvailable,
        borrowedByBranches,
        borrowedByBranchIds,
        sourceBranchId: isBorrowedForRequestedBranch ? menuItem.branchId : undefined,
        branchId: isBorrowedForRequestedBranch ? options?.requestedBranchId : menuItem.branchId,
    };
};
