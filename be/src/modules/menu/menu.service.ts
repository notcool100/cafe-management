import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { assertMenuItemEntitlement } from '../../utils/entitlements';

type NewToppingInput = {
    name: string;
    price: number;
};

type MenuWriteData = {
    name: string;
    description?: string;
    price: number;
    category?: string;
    imageUrl?: string;
    branchId: string;
    sharedBranchIds?: string[];
    disabledBranchIds?: string[];
    toppingIds?: string[];
    newToppings?: NewToppingInput[];
};

type MenuUpdateData = {
    name?: string;
    description?: string;
    price?: number;
    category?: string;
    imageUrl?: string;
    isAvailable?: boolean;
    sharedBranchIds?: string[];
    disabledBranchIds?: string[];
    toppingIds?: string[];
    newToppings?: NewToppingInput[];
};

type CategoryDbClient = typeof prisma | Prisma.TransactionClient;

const DEFAULT_TOPPING_CATEGORY = 'Topping';

export class MenuService {
    static async createMenuItem(
        data: MenuWriteData,
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
        const resolvedToppingIds = await resolveToppingIds({
            tenantId: branch.tenantId,
            toppingIds: data.toppingIds,
        });
        const normalizedNewToppings = normalizeNewToppings(data.newToppings);

        const menuItem = await prisma.$transaction(async (tx) => {
            if (categoryName) {
                await ensureCategoryExists({
                    db: tx,
                    name: categoryName,
                    branchId: data.branchId,
                    tenantId: branch.tenantId,
                });
            }

            const createdToppingIds = await createLinkedToppings({
                db: tx,
                branchId: data.branchId,
                tenantId: branch.tenantId,
                sharedBranchIds,
                disabledBranchIds,
                newToppings: normalizedNewToppings,
            });
            const toppingIds = combineUniqueIds(resolvedToppingIds, createdToppingIds);

            return tx.menuItem.create({
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
                    toppingIds,
                },
                include: { branch: true },
            });
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
        data: MenuUpdateData,
        tenantId?: string
    ) {
        const existing = await prisma.menuItem.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            select: {
                tenantId: true,
                branchId: true,
                sharedBranchIds: true,
                disabledBranchIds: true,
                toppingIds: true,
            },
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
        const normalizedNewToppings = normalizeNewToppings(data.newToppings);
        const resolvedToppingIds = data.toppingIds !== undefined
            ? await resolveToppingIds({
                tenantId: existing.tenantId,
                toppingIds: data.toppingIds,
            })
            : undefined;

        const menuItem = await prisma.$transaction(async (tx) => {
            if (categoryName) {
                await ensureCategoryExists({
                    db: tx,
                    name: categoryName,
                    branchId: existing.branchId,
                    tenantId: existing.tenantId,
                });
            }

            const effectiveDisabledBranchIds = disabledBranchIds ?? existing.disabledBranchIds ?? [];
            const createdToppingIds = await createLinkedToppings({
                db: tx,
                branchId: existing.branchId,
                tenantId: existing.tenantId,
                sharedBranchIds: effectiveSharedBranchIds,
                disabledBranchIds: effectiveDisabledBranchIds,
                newToppings: normalizedNewToppings,
            });
            const nextToppingIds = resolvedToppingIds !== undefined || createdToppingIds.length > 0
                ? combineUniqueIds(resolvedToppingIds ?? existing.toppingIds ?? [], createdToppingIds)
                : undefined;

            return tx.menuItem.update({
                where: { id },
                data: {
                    ...data,
                    ...(data.category !== undefined ? { category: categoryName } : {}),
                    ...(sharedBranchIds !== undefined ? { sharedBranchIds } : {}),
                    ...(disabledBranchIds !== undefined ? { disabledBranchIds } : {}),
                    ...(nextToppingIds !== undefined ? { toppingIds: nextToppingIds } : {}),
                },
                include: { branch: true },
            });
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

const normalizeMenuItem = (menuItem: any): any => ({
    ...menuItem,
    available: menuItem.isAvailable,
    sharedBranchIds: menuItem.sharedBranchIds || [],
    disabledBranchIds: menuItem.disabledBranchIds || [],
    toppingIds: menuItem.toppingIds || [],
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
    db = prisma,
}: {
    name: string;
    branchId: string;
    tenantId: string;
    db?: CategoryDbClient;
}) => {
    const existing = await db.category.findFirst({
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

    await db.category.create({
        data: {
            name,
            branchId,
            tenantId,
        },
    });
};

const normalizeNewToppings = (newToppings?: NewToppingInput[]) => {
    if (!newToppings || newToppings.length === 0) {
        return [];
    }

    const seen = new Set<string>();

    return newToppings.flatMap((topping) => {
        const name = topping.name?.trim();
        const price = Number(topping.price);

        if (!name || !Number.isFinite(price) || price <= 0) {
            return [];
        }

        const normalizedName = name.toLowerCase();
        if (seen.has(normalizedName)) {
            return [];
        }

        seen.add(normalizedName);

        return [{
            name,
            price,
        }];
    });
};

const normalizeCategoryName = (value?: string | null) =>
    (value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ');

const isToppingCategoryName = (value?: string | null) => {
    const normalized = normalizeCategoryName(value);

    return [
        'topping',
        'toppings',
        'addon',
        'addons',
        'add on',
        'add ons',
        'extra',
        'extras',
    ].includes(normalized);
};

const resolveToppingIds = async ({
    tenantId,
    toppingIds,
}: {
    tenantId: string;
    toppingIds?: string[];
}) => {
    if (!toppingIds || toppingIds.length === 0) {
        return [];
    }

    const uniqueIds = Array.from(new Set(toppingIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
        return [];
    }

    const toppingItems = await prisma.menuItem.findMany({
        where: {
            id: { in: uniqueIds },
            tenantId,
        },
        select: {
            id: true,
            category: true,
        },
    });

    const validIds = new Set(
        toppingItems
            .filter((item) => isToppingCategoryName(item.category))
            .map((item) => item.id)
    );

    return uniqueIds.filter((id) => validIds.has(id));
};

const createLinkedToppings = async ({
    db,
    branchId,
    tenantId,
    sharedBranchIds,
    disabledBranchIds,
    newToppings,
}: {
    db: Prisma.TransactionClient;
    branchId: string;
    tenantId: string;
    sharedBranchIds: string[];
    disabledBranchIds: string[];
    newToppings: NewToppingInput[];
}) => {
    if (newToppings.length === 0) {
        return [];
    }

    await ensureCategoryExists({
        db,
        name: DEFAULT_TOPPING_CATEGORY,
        branchId,
        tenantId,
    });

    const createdToppings: string[] = [];

    for (const topping of newToppings) {
        const created = await db.menuItem.create({
            data: {
                name: topping.name,
                description: `${topping.name} topping`,
                price: topping.price,
                category: DEFAULT_TOPPING_CATEGORY,
                branchId,
                tenantId,
                sharedBranchIds,
                disabledBranchIds,
                toppingIds: [],
            },
            select: { id: true },
        });

        createdToppings.push(created.id);
    }

    return createdToppings;
};

const combineUniqueIds = (...lists: string[][]) =>
    Array.from(new Set(lists.flat().filter(Boolean)));
