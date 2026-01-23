import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import { generateBranchQR } from '../../utils/qrcode';

export class AdminService {
    static async createEmployee(data: {
        email: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
        branchId?: string;
    }) {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
            include: { branch: true },
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
            createdAt: user.createdAt,
        };
    }

    static async listEmployees(branchId?: string) {
        const users = await prisma.user.findMany({
            where: {
                isActive: true,
                ...(branchId ? { branchId } : {}),
            },
            include: { branch: true },
            orderBy: { createdAt: 'desc' },
        });

        return users.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
            createdAt: user.createdAt,
        }));
    }

    static async getEmployee(id: string) {
        const user = await prisma.user.findFirst({
            where: {
                id,
                isActive: true,
            },
            include: { branch: true },
        });

        if (!user) {
            throw new Error('Employee not found');
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
            createdAt: user.createdAt,
        };
    }

    static async updateEmployee(
        id: string,
        data: {
            name?: string;
            role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
            branchId?: string;
        }
    ) {
        const user = await prisma.user.update({
            where: { id },
            data,
            include: { branch: true },
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
        };
    }

    static async deleteEmployee(id: string) {
        await prisma.user.update({
            where: { id },
            data: { isActive: false },
        });

        return { message: 'Employee deactivated successfully' };
    }

    static async createBranch(data: {
        name: string;
        location: string;
        hasTokenSystem: boolean;
        maxTokenNumber?: number;
    }) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const branch = await prisma.branch.create({
            data: {
                name: data.name,
                location: data.location,
                hasTokenSystem: data.hasTokenSystem,
                maxTokenNumber: data.maxTokenNumber,
            },
        });

        // Generate QR code for the branch
        const qrCode = await generateBranchQR(branch.id, frontendUrl);

        // Update branch with QR code
        const updatedBranch = await prisma.branch.update({
            where: { id: branch.id },
            data: { qrCode },
        });

        return updatedBranch;
    }

    static async listBranches() {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            include: {
                _count: {
                    select: {
                        users: true,
                        menuItems: true,
                        orders: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return branches;
    }

    static async getBranch(id: string) {
        const branch = await prisma.branch.findUnique({
            where: { id, isActive: true },
            include: {
                users: true,
                _count: {
                    select: {
                        menuItems: true,
                        orders: true,
                    },
                },
            },
        });

        if (!branch) {
            throw new Error('Branch not found');
        }

        return branch;
    }

    static async updateBranch(
        id: string,
        data: {
            name?: string;
            location?: string;
            hasTokenSystem?: boolean;
            maxTokenNumber?: number;
        }
    ) {
        const branch = await prisma.branch.update({
            where: { id },
            data,
        });

        return branch;
    }

    static async deleteBranch(id: string) {
        await prisma.branch.update({
            where: { id },
            data: { isActive: false },
        });

        return { message: 'Branch deactivated successfully' };
    }

    static async getReportOverview(filters: {
        branchId?: string;
        startDate: Date;
        endDate: Date;
    }) {
        const baseWhere = {
            ...(filters.branchId && { branchId: filters.branchId }),
            createdAt: {
                gte: filters.startDate,
                lte: filters.endDate,
            },
        };

        const [
            totalOrders,
            completedAggregate,
            cancelledAggregate,
            statusGroups,
            branchOrderCounts,
            branchSales,
            branchCancellations,
            orderItems,
            completedOrdersForTrend,
        ] = await Promise.all([
            prisma.order.count({ where: baseWhere }),
            prisma.order.aggregate({
                where: { ...baseWhere, status: 'COMPLETED' },
                _sum: { totalAmount: true },
                _count: { _all: true },
            }),
            prisma.order.aggregate({
                where: { ...baseWhere, status: 'CANCELLED' },
                _sum: { totalAmount: true },
                _count: { _all: true },
            }),
            prisma.order.groupBy({
                by: ['status'],
                where: baseWhere,
                _count: { _all: true },
            }),
            prisma.order.groupBy({
                by: ['branchId'],
                where: baseWhere,
                _count: { _all: true },
            }),
            prisma.order.groupBy({
                by: ['branchId'],
                where: { ...baseWhere, status: 'COMPLETED' },
                _sum: { totalAmount: true },
                _count: { _all: true },
            }),
            prisma.order.groupBy({
                by: ['branchId'],
                where: { ...baseWhere, status: 'CANCELLED' },
                _sum: { totalAmount: true },
                _count: { _all: true },
            }),
            prisma.orderItem.findMany({
                where: {
                    order: baseWhere,
                },
                include: {
                    menuItem: true,
                    order: {
                        select: { branchId: true },
                    },
                },
            }),
            prisma.order.findMany({
                where: { ...baseWhere, status: 'COMPLETED' },
                select: { createdAt: true, totalAmount: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        const totalSales = Number(completedAggregate._sum.totalAmount || 0);
        const completedOrders = completedAggregate._count?._all || 0;
        const cancelledOrders = cancelledAggregate._count?._all || 0;
        const cancellationLoss = Number(cancelledAggregate._sum.totalAmount || 0);

        const statusBreakdown = {
            PENDING: 0,
            PREPARING: 0,
            READY: 0,
            COMPLETED: 0,
            CANCELLED: 0,
        } as Record<string, number>;

        statusGroups.forEach((group) => {
            statusBreakdown[group.status] = group._count._all;
        });

        const branchIds = new Set<string>();
        branchOrderCounts.forEach((entry) => branchIds.add(entry.branchId));
        branchSales.forEach((entry) => branchIds.add(entry.branchId));
        branchCancellations.forEach((entry) => branchIds.add(entry.branchId));

        const branchDetails = branchIds.size
            ? await prisma.branch.findMany({
                where: { id: { in: Array.from(branchIds) } },
                select: { id: true, name: true, location: true },
            })
            : [];

        const branchMap = new Map(branchDetails.map((branch) => [branch.id, branch]));
        const branchOrderCountMap = new Map(
            branchOrderCounts.map((entry) => [entry.branchId, entry._count._all])
        );
        const branchSalesMap = new Map(
            branchSales.map((entry) => [
                entry.branchId,
                {
                    sales: Number(entry._sum.totalAmount || 0),
                    completedOrders: entry._count._all,
                },
            ])
        );
        const branchCancellationMap = new Map(
            branchCancellations.map((entry) => [
                entry.branchId,
                {
                    cancellationLoss: Number(entry._sum.totalAmount || 0),
                    cancelledOrders: entry._count._all,
                },
            ])
        );

        const branchBreakdown = Array.from(branchIds)
            .map((branchId) => {
                const branchInfo = branchMap.get(branchId);
                const branchSalesInfo =
                    branchSalesMap.get(branchId) || { sales: 0, completedOrders: 0 };
                const branchCancellationInfo =
                    branchCancellationMap.get(branchId) || { cancellationLoss: 0, cancelledOrders: 0 };
                const branchOrderCount = branchOrderCountMap.get(branchId) || 0;
                const averageOrderValue =
                    branchSalesInfo.completedOrders > 0
                        ? branchSalesInfo.sales / branchSalesInfo.completedOrders
                        : 0;

                return {
                    branchId,
                    branchName: branchInfo?.name || 'Unknown Branch',
                    location: branchInfo?.location || '',
                    totalOrders: branchOrderCount,
                    completedOrders: branchSalesInfo.completedOrders,
                    totalSales: branchSalesInfo.sales,
                    cancellationLoss: branchCancellationInfo.cancellationLoss,
                    cancelledOrders: branchCancellationInfo.cancelledOrders,
                    netSales: branchSalesInfo.sales - branchCancellationInfo.cancellationLoss,
                    averageOrderValue,
                };
            })
            .sort((a, b) => b.totalSales - a.totalSales);

        const itemTotals = new Map<
            string,
            { menuItemId: string; name: string; quantity: number; revenue: number }
        >();
        const branchItemTotals = new Map<
            string,
            Map<string, { menuItemId: string; name: string; quantity: number; revenue: number }>
        >();

        orderItems.forEach((item) => {
            const revenue = Number(item.price) * item.quantity;
            const existing = itemTotals.get(item.menuItemId);

            if (existing) {
                existing.quantity += item.quantity;
                existing.revenue += revenue;
            } else {
                itemTotals.set(item.menuItemId, {
                    menuItemId: item.menuItemId,
                    name: item.menuItem?.name || 'Unknown Item',
                    quantity: item.quantity,
                    revenue,
                });
            }

            const branchId = item.order?.branchId;
            if (branchId) {
                const branchMap =
                    branchItemTotals.get(branchId) ||
                    new Map<string, { menuItemId: string; name: string; quantity: number; revenue: number }>();

                const branchExisting = branchMap.get(item.menuItemId);
                if (branchExisting) {
                    branchExisting.quantity += item.quantity;
                    branchExisting.revenue += revenue;
                } else {
                    branchMap.set(item.menuItemId, {
                        menuItemId: item.menuItemId,
                        name: item.menuItem?.name || 'Unknown Item',
                        quantity: item.quantity,
                        revenue,
                    });
                }

                branchItemTotals.set(branchId, branchMap);
            }
        });

        const topItems = Array.from(itemTotals.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const branchTopItems = Array.from(branchItemTotals.entries()).map(([branchId, items]) => {
            const branchInfo = branchMap.get(branchId);

            return {
                branchId,
                branchName: branchInfo?.name || 'Unknown Branch',
                items: Array.from(items.values())
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5),
            };
        });

        const trendAccumulator: Record<string, { sales: number; orders: number }> = {};

        completedOrdersForTrend.forEach((order) => {
            const key = order.createdAt.toISOString().split('T')[0];
            const existing = trendAccumulator[key] || { sales: 0, orders: 0 };

            existing.sales += Number(order.totalAmount || 0);
            existing.orders += 1;

            trendAccumulator[key] = existing;
        });

        const dailyTrend: Array<{ date: string; sales: number; orders: number }> = [];
        for (
            let cursor = new Date(filters.startDate);
            cursor <= filters.endDate;
            cursor.setDate(cursor.getDate() + 1)
        ) {
            const key = cursor.toISOString().split('T')[0];
            const entry = trendAccumulator[key] || { sales: 0, orders: 0 };

            dailyTrend.push({
                date: key,
                sales: Number(entry.sales.toFixed(2)),
                orders: entry.orders,
            });
        }

        return {
            filters: {
                branchId: filters.branchId || null,
                startDate: filters.startDate.toISOString(),
                endDate: filters.endDate.toISOString(),
            },
            totals: {
                totalSales,
                netSales: totalSales - cancellationLoss,
                cancellationLoss,
                totalOrders,
                completedOrders,
                cancelledOrders,
                averageOrderValue: completedOrders > 0 ? totalSales / completedOrders : 0,
            },
            statusBreakdown,
            branchBreakdown,
            topItems,
            branchTopItems,
            dailyTrend,
        };
    }
}
