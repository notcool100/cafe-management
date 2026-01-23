import prisma from '../../config/database';
import { TokenManager } from '../../utils/token';

export class OrderService {
    static async createOrder(data: {
        branchId: string;
        items: Array<{ menuItemId: string; quantity: number }>;
        customerName?: string;
        customerPhone?: string;
    }) {
        // Validate all menu items exist and calculate total
        const menuItems = await prisma.menuItem.findMany({
            where: {
                id: { in: data.items.map((item) => item.menuItemId) },
                branchId: data.branchId,
                isAvailable: true,
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

        // Generate token
        const tokenNumber = await TokenManager.generateToken(data.branchId);

        // Create order with items
        const order = await prisma.order.create({
            data: {
                branchId: data.branchId,
                tokenNumber,
                totalAmount,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                status: 'PENDING',
                orderItems: {
                    create: orderItemsData,
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
        });

        return order;
    }

    static async getOrder(id: string) {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                orderItems: {
                    include: {
                        menuItem: true,
                    },
                },
                branch: true,
            },
        });

        if (!order) {
            throw new Error('Order not found');
        }

        return order;
    }

    static async listOrders(filters: {
        branchId?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }) {
        const orders = await prisma.order.findMany({
            where: {
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

    static async updateOrderStatus(
        id: string,
        status: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED',
        completedBy?: string
    ) {
        const order = await prisma.order.update({
            where: { id },
            data: {
                status,
                ...(status === 'COMPLETED' && {
                    completedAt: new Date(),
                    completedBy,
                }),
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
