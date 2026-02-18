import prisma from '../../config/database';
import { TokenManager } from '../../utils/token';

const borrowableMenuScope = (branchId: string) => ({
    OR: [
        { branchId },
        {
            borrowedByBranches: {
                some: {
                    targetBranchId: branchId,
                },
            },
        },
        {
            // Transferable items can be borrowed from other branches at order time.
            isTransferable: true,
            branchId: { not: branchId },
        },
    ],
});

const orderItemsWithMenuBranchInclude = {
    include: {
        menuItem: {
            include: {
                branch: true,
            },
        },
    },
};

export class OrderService {
    private static CANCELLATION_GRACE_MS = 60_000; // 1 minute

    static async finalizeExpiredCancellations() {
        const now = new Date();
        await prisma.order.updateMany({
            where: {
                status: 'CANCELLATION_PENDING',
                cancellationExpiresAt: { lte: now },
            },
            data: {
                status: 'CANCELLED',
                cancellationFinalizedAt: now,
            },
        });
    }

    static async createOrder(
        data: {
            branchId: string;
            items: Array<{ menuItemId: string; quantity: number }>;
            customerName?: string;
            customerPhone?: string;
            deviceId?: string;
            orderType?: 'DINE_IN' | 'TAKEAWAY';
        },
        tenantId?: string
    ) {
        const branch = await prisma.branch.findUnique({
            where: { id: data.branchId },
            select: { id: true, tenantId: true },
        });

        if (!branch) {
            throw new Error('Branch not found');
        }

        if (tenantId && branch.tenantId !== tenantId) {
            throw new Error('Forbidden: Cross-tenant order creation not allowed');
        }

        // Validate all menu items exist and calculate total
        const menuItems = await prisma.menuItem.findMany({
            where: {
                id: { in: data.items.map((item) => item.menuItemId) },
                tenantId: branch.tenantId,
                isAvailable: true,
                ...borrowableMenuScope(data.branchId),
            },
        });

        if (menuItems.length !== data.items.length) {
            throw new Error('Some menu items are not available or do not exist');
        }

        // Calculate total amount
        let totalAmount = 0;
        const orderItemsData = data.items.map((item) => {
            const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
            if (!menuItem) {
                throw new Error(`Menu item ${item.menuItemId} not found`);
            }

            const itemTotal = Number(menuItem.price) * item.quantity;
            totalAmount += itemTotal;

            return {
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: menuItem.price,
            };
        });

        // Generate token only for dine-in orders
        const isTakeaway = data.orderType === 'TAKEAWAY';
        const tokenNumber = isTakeaway ? null : await TokenManager.generateToken(data.branchId);

        // Create order with items
        const order = await prisma.order.create({
            data: {
                branchId: data.branchId,
                tenantId: branch.tenantId,
                tokenNumber,
                orderType: isTakeaway ? 'TAKEAWAY' : 'DINE_IN',
                totalAmount,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                deviceId: data.deviceId,
                status: 'PENDING',
                orderItems: {
                    create: orderItemsData,
                },
            },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
        });

        return order;
    }

    static async getOrder(id: string, tenantId?: string) {
        await this.finalizeExpiredCancellations();

        const order = await prisma.order.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
        });

        if (!order) {
            throw new Error('Order not found');
        }

        return order;
    }

    static async listOrders(filters: {
        tenantId: string;
        branchId?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        await this.finalizeExpiredCancellations();

        const orders = await prisma.order.findMany({
            where: {
                tenantId: filters.tenantId,
                ...(filters.branchId && { branchId: filters.branchId }),
                ...(filters.status && { status: filters.status as any }),
                ...(filters.startDate &&
                    filters.endDate && {
                    createdAt: {
                        gte: filters.startDate,
                        lte: filters.endDate,
                    },
                }),
            },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return orders;
    }

    static async listOrdersByDevice(deviceId: string) {
        await this.finalizeExpiredCancellations();

        const orders = await prisma.order.findMany({
            where: { deviceId },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return orders;
    }

    static async updateOrderStatus(
        id: string,
        status: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' | 'CANCELLATION_PENDING',
        completedBy?: string,
        tenantId?: string,
        branchConstraint?: string
    ) {
        const existing = await prisma.order.findFirst({
            where: {
                id,
                ...(tenantId ? { tenantId } : {}),
                ...(branchConstraint ? { branchId: branchConstraint } : {}),
            },
            select: { id: true, status: true },
        });

        if (!existing) {
            throw new Error('Order not found');
        }

        const isTerminal = existing.status === 'COMPLETED' || existing.status === 'CANCELLED';
        if (isTerminal && existing.status !== status) {
            throw new Error('Completed or cancelled orders cannot be updated');
        }

        if (status === 'CANCELLED') {
            return this.requestCancellation(id, completedBy, tenantId, branchConstraint);
        }

        const order = await prisma.order.update({
            where: { id: existing.id },
            data: {
                status,
                ...(status === 'COMPLETED' && {
                    completedAt: new Date(),
                    completedBy,
                }),
                ...(status !== 'CANCELLATION_PENDING' && {
                    cancellationRequestedAt: null,
                    cancellationRequestedBy: null,
                    cancellationExpiresAt: null,
                    cancellationPreviousStatus: null,
                    cancellationFinalizedAt: null,
                }),
            },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
        });

        return order;
    }

    static async requestCancellation(
        orderId: string,
        userId?: string,
        tenantId?: string,
        branchConstraint?: string
    ) {
        const existing = await prisma.order.findFirst({
            where: {
                id: orderId,
                ...(tenantId ? { tenantId } : {}),
                ...(branchConstraint ? { branchId: branchConstraint } : {}),
            },
            select: { status: true },
        });

        if (!existing) {
            throw new Error('Order not found');
        }

        if (existing.status === 'CANCELLED') {
            throw new Error('Order already cancelled');
        }

        const expiresAt = new Date(Date.now() + this.CANCELLATION_GRACE_MS);

        return prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'CANCELLATION_PENDING',
                cancellationRequestedAt: new Date(),
                cancellationRequestedBy: userId,
                cancellationExpiresAt: expiresAt,
                cancellationPreviousStatus: existing.status as any,
            },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
        });
    }

    static async undoCancellation(
        orderId: string,
        userId?: string,
        tenantId?: string,
        branchConstraint?: string
    ) {
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                ...(tenantId ? { tenantId } : {}),
                ...(branchConstraint ? { branchId: branchConstraint } : {}),
            },
        });

        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status !== 'CANCELLATION_PENDING') {
            throw new Error('No pending cancellation to undo');
        }

        const now = new Date();
        if (order.cancellationExpiresAt && order.cancellationExpiresAt <= now) {
            // finalize immediately
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'CANCELLED',
                    cancellationFinalizedAt: now,
                },
            });
            throw new Error('Cancellation already finalized');
        }

        const previousStatus = order.cancellationPreviousStatus || 'PENDING';

        return prisma.order.update({
            where: { id: orderId },
            data: {
                status: previousStatus,
                cancellationRequestedAt: null,
                cancellationRequestedBy: null,
                cancellationExpiresAt: null,
                cancellationPreviousStatus: null,
                cancellationFinalizedAt: null,
            },
            include: {
                orderItems: orderItemsWithMenuBranchInclude,
                branch: true,
            },
        });
    }
}
