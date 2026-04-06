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
            disabledBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const branch = await prisma.branch.findFirst({
            where: { id: data.branchId, ...(tenantId ? { tenantId } : {}) },
            select: { tenantId: true, isActive: true },
        });

        if (!Number.isFinite(data.price) || data.price <= 0) {
            throw new Error('Price must be greater than 0');
        }

        if (!branch || !branch.isActive) {
            throw new Error('Branch not found for this tenant');
        }

        await assertMenuItemEntitlement(branch.tenantId);

        const sharedBranchIds = await resolveSharedBranchIds({
            branchId: data.branchId,
            tenantId: branch.tenantId,
            sharedBranchIds: data.sharedBranchIds,
        });
        const disabledBranchIds = await resolveDisabledBranchIds({
            branchId: data.branchId,
            tenantId: branch.tenantId,
            sharedBranchIds,
            disabledBranchIds: data.disabledBranchIds,
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
                disabledBranchIds,
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
            disabledBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const existing = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: { tenantId: true, branchId: true, sharedBranchIds: true, disabledBranchIds: true },
        });

        if (!existing) {
            throw new Error('Menu item not found');
        }

        if (data.price !== undefined && (!Number.isFinite(data.price) || data.price <= 0)) {
            throw new Error('Price must be greater than 0');
        }

        const sharedBranchIds = data.sharedBranchIds !== undefined
            ? await resolveSharedBranchIds({
                branchId: existing.branchId,
                tenantId: existing.tenantId,
                sharedBranchIds: data.sharedBranchIds,
            })
            : undefined;
        const effectiveSharedBranchIds = sharedBranchIds ?? existing.sharedBranchIds ?? [];
        const disabledBranchIds = data.disabledBranchIds !== undefined
            ? await resolveDisabledBranchIds({
                branchId: existing.branchId,
                tenantId: existing.tenantId,
                sharedBranchIds: effectiveSharedBranchIds,
                disabledBranchIds: data.disabledBranchIds,
            })
            : sharedBranchIds !== undefined
                ? await resolveDisabledBranchIds({
                    branchId: existing.branchId,
                    tenantId: existing.tenantId,
                    sharedBranchIds: effectiveSharedBranchIds,
                    disabledBranchIds: existing.disabledBranchIds ?? [],
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
                ...(disabledBranchIds !== undefined ? { disabledBranchIds } : {}),
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
                NOT: {
                    disabledBranchIds: { has: branchId },
                },
                OR: [
                    { branchId },
                    { sharedBranchIds: { has: branchId } },
                ],
            },
            include: { branch: true },
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
    disabledBranchIds: menuItem.disabledBranchIds || [],
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

const resolveDisabledBranchIds = async ({
    branchId,
    tenantId,
    sharedBranchIds,
    disabledBranchIds,
}: {
    branchId: string;
    tenantId: string;
    sharedBranchIds?: string[];
    disabledBranchIds?: string[];
}) => {
    if (!disabledBranchIds || disabledBranchIds.length === 0) {
        return [];
    }

    const allowedBranchIds = new Set([branchId, ...(sharedBranchIds || []).filter(Boolean)]);
    const uniqueIds = Array.from(new Set(disabledBranchIds.filter(Boolean)));
    const filteredIds = uniqueIds.filter((id) => allowedBranchIds.has(id));

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

    const validIds = new Set(branches.map((branch) => branch.id));

    return filteredIds.filter((id) => validIds.has(id));
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
