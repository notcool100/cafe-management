import prisma from '../../config/database';

export class MenuService {
    static async createMenuItem(data: {
        name: string;
        description?: string;
        price: number;
        category?: string;
        imageUrl?: string;
        branchId: string;
    }) {
        const menuItem = await prisma.menuItem.create({
            data: {
                name: data.name,
                description: data.description,
                price: data.price,
                category: data.category,
                imageUrl: data.imageUrl,
                branchId: data.branchId,
            },
            include: { branch: true },
        });

        return normalizeMenuItem(menuItem);
    }

    static async listMenuItems(branchId?: string, category?: string) {
        const menuItems = await prisma.menuItem.findMany({
            where: {
                ...(branchId && { branchId }),
                ...(category && { category }),
            },
            include: { branch: true },
            orderBy: { createdAt: 'desc' },
        });

        return menuItems.map(normalizeMenuItem);
    }

    static async getMenuItem(id: string) {
        const menuItem = await prisma.menuItem.findUnique({
            where: { id },
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
        }
    ) {
        const menuItem = await prisma.menuItem.update({
            where: { id },
            data,
            include: { branch: true },
        });

        return normalizeMenuItem(menuItem);
    }

    static async deleteMenuItem(id: string) {
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
