import prisma from '../../config/database';
import { OrderService } from '../order/order.service';

export class StaffService {
    static async getActiveOrders(branchId?: string, tenantId?: string) {
        await OrderService.finalizeExpiredCancellations();
        const orders = await prisma.order.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                ...(branchId && { branchId }),
                status: {
                    in: ['PENDING', 'PREPARING', 'READY', 'CANCELLATION_PENDING'],
                },
            },
            include: {
                orderItems: {
                    include: {
                        menuItem: true,
                    },
                },
                branch: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return orders;
    }

    static async getOrdersByStatus(branchId: string, status: string, tenantId?: string) {
        await OrderService.finalizeExpiredCancellations();
        const orders = await prisma.order.findMany({
            where: {
                branchId,
                ...(tenantId ? { tenantId } : {}),
                status: status as any,
            },
            include: {
                orderItems: {
                    include: {
                        menuItem: true,
                    },
                },
                branch: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return orders;
    }

    static async completeOrder(orderId: string, staffId: string, tenantId?: string, branchIds?: string[]) {
        const existing = await prisma.order.findFirst({
            where: {
                id: orderId,
                ...(tenantId ? { tenantId } : {}),
                ...(branchIds && branchIds.length > 0 ? { branchId: { in: branchIds } } : {}),
            },
            select: { id: true },
        });

        if (!existing) {
            throw new Error('Order not found');
        }

        const order = await prisma.order.update({
            where: { id: existing.id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                completedBy: staffId,
            },
            include: {
                orderItems: {
                    include: {
                        menuItem: true,
                    },
                },
                branch: true,
            },
        });

        return order;
    }

    static async getSharedItemNotifications(branchId: string, tenantId: string, since?: Date) {
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                status: 'COMPLETED',
                branchId: { not: branchId },
                ...(since ? { completedAt: { gte: since } } : {}),
                orderItems: {
                    some: {
                        menuItem: {
                            branchId,
                        },
                    },
                },
            },
            include: {
                orderItems: {
                    include: {
                        menuItem: true,
                    },
                },
                branch: true,
            },
            orderBy: { completedAt: 'desc' },
            take: 15,
        });

        return orders.map((order) => {
            const sharedItems = order.orderItems.filter(
                (item) => item.menuItem?.branchId === branchId
            );

            return {
                orderId: order.id,
                completedAt: order.completedAt ?? order.updatedAt,
                orderBranchId: order.branchId,
                orderBranchName: order.branch?.name,
                itemNames: sharedItems.map((item) => item.menuItem?.name || 'Item'),
            };
        });
    }

    static async getOrderNotifications(branchId: string, tenantId: string, since?: Date) {
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                branchId,
                ...(since ? { createdAt: { gte: since } } : {}),
            },
            include: {
                orderItems: {
                    include: {
                        menuItem: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 15,
        });

        return orders.map((order) => ({
            orderId: order.id,
            createdAt: order.createdAt,
            status: order.status,
            totalAmount: Number(order.totalAmount),
            tokenNumber: order.tokenNumber ?? undefined,
            orderType: order.orderType,
            customerName: order.customerName ?? undefined,
            itemNames: order.orderItems.map((item) => item.menuItem?.name || 'Item'),
        }));
    }
}
