import prisma from '../../config/database';
import { assertMenuItemEntitlement } from '../../utils/entitlements';

export class MenuService {
    static async createMenuItem(
        data: {
            name: string;
            description?: string;
            price: number;
            category?: string;
            imageUrl?: string;
            branchId: string;
            sharedBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const branch = await prisma.branch.findFirst({
            where: { id: data.branchId, ...(tenantId ? { tenantId } : {}) },
            select: { tenantId: true, isActive: true },
        });

        if (!branch || !branch.isActive) {
            throw new Error('Branch not found for this tenant');
        }

        await assertMenuItemEntitlement(branch.tenantId);

        const sharedBranchIds = await resolveSharedBranchIds({
            branchId: data.branchId,
            tenantId: branch.tenantId,
            sharedBranchIds: data.sharedBranchIds,
        });

        const categoryName = data.category?.trim();
        if (categoryName) {
            await ensureCategoryExists({
                name: categoryName,
                branchId: data.branchId,
                tenantId: branch.tenantId,
            });
        }

        const menuItem = await prisma.menuItem.create({
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                category: categoryName,
                imageUrl: data.imageUrl,
                branchId: data.branchId,
                tenantId: branch.tenantId,
                sharedBranchIds,
            },
            include: { branch: true },
        });

        return normalizeMenuItem(menuItem);
    }

    static async listMenuItems(branchId?: string, category?: string, tenantId?: string) {
        const menuItems = await prisma.menuItem.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                ...(branchId && {
                    OR: [
                        { branchId },
                        { sharedBranchIds: { has: branchId } },
                    ],
                }),
                ...(category && { category }),
            },
            include: { branch: true },
            orderBy: { createdAt: 'desc' },
        });

        return menuItems.map(normalizeMenuItem);
    }

    static async getMenuItem(id: string, tenantId?: string) {
        const menuItem = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: { branch: true },
        });

        if (!menuItem) {
            throw new Error('Menu item not found');
        }

        return normalizeMenuItem(menuItem);
    }

    static async updateMenuItem(
        id: string,
        data: {
            name?: string;
            description?: string;
            price?: number;
            category?: string;
            imageUrl?: string;
            isAvailable?: boolean;
            sharedBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const existing = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: { tenantId: true, branchId: true },
        });

        if (!existing) {
            throw new Error('Menu item not found');
        }

        const sharedBranchIds = data.sharedBranchIds !== undefined
            ? await resolveSharedBranchIds({
                branchId: existing.branchId,
                tenantId: existing.tenantId,
                sharedBranchIds: data.sharedBranchIds,
            })
            : undefined;

        const categoryName = data.category?.trim();
        if (categoryName) {
            await ensureCategoryExists({
                name: categoryName,
                branchId: existing.branchId,
                tenantId: existing.tenantId,
            });
        }

        const menuItem = await prisma.menuItem.update({
            where: { id },
            data: {
                ...data,
                ...(data.category !== undefined ? { category: categoryName } : {}),
                ...(sharedBranchIds !== undefined ? { sharedBranchIds } : {}),
            },
            include: { branch: true },
        });

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
                OR: [
                    { branchId },
                    { sharedBranchIds: { has: branchId } },
                ],
            },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });

        return {
            branch: {
                id: branch.id,
                name: branch.name,
                location: branch.location,
            },
            menuItems: menuItems.map(normalizeMenuItem),
        };
    }
}

const normalizeMenuItem = (menuItem: any) => ({
    ...menuItem,
    available: menuItem.isAvailable,
    sharedBranchIds: menuItem.sharedBranchIds || [],
});

const resolveSharedBranchIds = async ({
    branchId,
    tenantId,
    sharedBranchIds,
}: {
    branchId: string;
    tenantId: string;
    sharedBranchIds?: string[];
}) => {
    if (!sharedBranchIds || sharedBranchIds.length === 0) {
        return [];
    }

    const uniqueIds = Array.from(new Set(sharedBranchIds.filter(Boolean)));
    const filteredIds = uniqueIds.filter((id) => id !== branchId);

    if (filteredIds.length === 0) {
        return [];
    }

    const branches = await prisma.branch.findMany({
        where: {
            id: { in: filteredIds },
            tenantId,
        },
        select: { id: true },
    });

    return branches.map((branch) => branch.id);
};

const ensureCategoryExists = async ({
    name,
    branchId,
    tenantId,
}: {
    name: string;
    branchId: string;
    tenantId: string;
}) => {
    const existing = await prisma.category.findFirst({
        where: {
            tenantId,
            name,
            OR: [
                { branchId },
                { sharedBranchIds: { has: branchId } },
            ],
        },
        select: { id: true },
    });

    if (existing) return;

    await prisma.category.create({
        data: {
            name,
            branchId,
            tenantId,
        },
    });
};
