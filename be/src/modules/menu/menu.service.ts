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

        const menuItem = await prisma.menuItem.create({
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                imageUrl: data.imageUrl,
                branchId: data.branchId,
                tenantId: branch.tenantId,
            },
            include: { branch: true },
        });

        return normalizeMenuItem(menuItem);
    }

    static async listMenuItems(branchId?: string, category?: string, tenantId?: string) {
        const menuItems = await prisma.menuItem.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                ...(branchId && { branchId }),
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
        },
        tenantId?: string
    ) {
        const existing = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: { tenantId: true },
        });

        if (!existing) {
            throw new Error('Menu item not found');
        }

        const menuItem = await prisma.menuItem.update({
            where: { id },
            data,
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
                branchId,
                isAvailable: true,
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
});
