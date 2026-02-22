import prisma from '../../config/database';

export class CategoryService {
    static async createCategory(
        data: {
            name: string;
            branchId: string;
            sharedBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const name = data.name?.trim();
        if (!name) {
            throw new Error('Category name is required');
        }

        const branch = await prisma.branch.findFirst({
            where: { id: data.branchId, ...(tenantId ? { tenantId } : {}) },
            select: { tenantId: true, isActive: true },
        });

        if (!branch || !branch.isActive) {
            throw new Error('Branch not found for this tenant');
        }

        const sharedBranchIds = await resolveSharedBranchIds({
            branchId: data.branchId,
            tenantId: branch.tenantId,
            sharedBranchIds: data.sharedBranchIds,
        });

        const category = await prisma.category.create({
            data: {
                name,
                branchId: data.branchId,
                tenantId: branch.tenantId,
                sharedBranchIds,
            },
            include: { branch: true },
        });

        return normalizeCategory(category);
    }

    static async listCategories(branchId?: string, tenantId?: string) {
        const categories = await prisma.category.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                ...(branchId && {
                    OR: [
                        { branchId },
                        { sharedBranchIds: { has: branchId } },
                    ],
                }),
            },
            include: { branch: true },
            orderBy: { name: 'asc' },
        });

        return categories.map(normalizeCategory);
    }

    static async getCategory(id: string, tenantId?: string) {
        const category = await prisma.category.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: { branch: true },
        });

        if (!category) {
            throw new Error('Category not found');
        }

        return normalizeCategory(category);
    }

    static async updateCategory(
        id: string,
        data: {
            name?: string;
            sharedBranchIds?: string[];
        },
        tenantId?: string
    ) {
        const existing = await prisma.category.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: { branchId: true, tenantId: true, name: true, sharedBranchIds: true },
        });

        if (!existing) {
            throw new Error('Category not found');
        }

        const sharedBranchIds = data.sharedBranchIds !== undefined
            ? await resolveSharedBranchIds({
                branchId: existing.branchId,
                tenantId: existing.tenantId,
                sharedBranchIds: data.sharedBranchIds,
            })
            : undefined;

        const nextName = data.name?.trim();
        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: nextName } : {}),
                ...(sharedBranchIds !== undefined ? { sharedBranchIds } : {}),
            },
            include: { branch: true },
        });

        if (nextName && nextName !== existing.name) {
            const priorShared = Array.isArray(existing.sharedBranchIds) ? existing.sharedBranchIds : [];
            const updatedShared = sharedBranchIds ?? priorShared;
            const targetBranchIds = Array.from(new Set([existing.branchId, ...priorShared, ...updatedShared]));

            await prisma.menuItem.updateMany({
                where: {
                    tenantId: existing.tenantId,
                    branchId: { in: targetBranchIds },
                    category: existing.name,
                },
                data: { category: nextName },
            });
        }

        return normalizeCategory(category);
    }

    static async deleteCategory(id: string, tenantId?: string) {
        const existing = await prisma.category.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: { id: true },
        });

        if (!existing) {
            throw new Error('Category not found');
        }

        await prisma.category.delete({ where: { id } });

        return { message: 'Category deleted successfully' };
    }
}

const normalizeCategory = (category: any) => ({
    ...category,
    sharedBranchIds: category.sharedBranchIds || [],
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
