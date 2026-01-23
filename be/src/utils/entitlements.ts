import prisma from '../config/database';

const ACTIVE_USER_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'];

export async function getActiveSubscription(tenantId: string) {
    return prisma.subscription.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
    });
}

async function enforceLimit(params: {
    tenantId: string;
    currentCount: number;
    limit?: number | null;
    message: string;
}) {
    const { currentCount, limit, message } = params;
    if (limit !== null && limit !== undefined && currentCount >= limit) {
        throw new Error(message);
    }
}

export async function assertBranchEntitlement(tenantId: string) {
    const subscription = await getActiveSubscription(tenantId);
    const limit = subscription?.plan?.branchesLimit;

    if (limit === null || limit === undefined) {
        return;
    }

    const branchCount = await prisma.branch.count({
        where: { tenantId, isActive: true },
    });

    await enforceLimit({
        tenantId,
        currentCount: branchCount,
        limit,
        message: 'Branch limit reached for your current plan. Upgrade to add more branches.',
    });
}

export async function assertSeatEntitlement(tenantId: string) {
    const subscription = await getActiveSubscription(tenantId);
    const limit = subscription?.plan?.seatsLimit;

    if (limit === null || limit === undefined) {
        return;
    }

    const userCount = await prisma.user.count({
        where: { tenantId, isActive: true, role: { in: ACTIVE_USER_ROLES as any } },
    });

    await enforceLimit({
        tenantId,
        currentCount: userCount,
        limit,
        message: 'Seat limit reached for your current plan. Upgrade to add more team members.',
    });
}

export async function assertMenuItemEntitlement(tenantId: string) {
    const subscription = await getActiveSubscription(tenantId);
    const limit = subscription?.plan?.menuItemsLimit;

    if (limit === null || limit === undefined) {
        return;
    }

    const menuItemCount = await prisma.menuItem.count({
        where: { tenantId },
    });

    await enforceLimit({
        tenantId,
        currentCount: menuItemCount,
        limit,
        message: 'Menu item limit reached for your current plan. Upgrade to add more items.',
    });
}
