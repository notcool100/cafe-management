import prisma from '../../config/database';
import { OrderService } from '../order/order.service';

export class StaffService {
    static async getActiveOrders(branchId?: string) {
        await OrderService.finalizeExpiredCancellations();
        const orders = await prisma.order.findMany({
            where: {
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

    static async getOrdersByStatus(branchId: string, status: string) {
        await OrderService.finalizeExpiredCancellations();
        const orders = await prisma.order.findMany({
            where: {
                branchId,
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

    static async completeOrder(orderId: string, staffId: string) {
        const order = await prisma.order.update({
            where: { id: orderId },
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
}
