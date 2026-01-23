import apiClient from './api-client';
import { OrderStatus, ReportOverview } from '../types';

interface ReportFilters {
    branchId?: string;
    startDate?: string;
    endDate?: string;
}

const normalizeNumber = (value: unknown) => Number(value ?? 0);

const normalizeStatusBreakdown = (statusBreakdown: ReportOverview['statusBreakdown']) => {
    const base: Record<OrderStatus, number> = {
        [OrderStatus.PENDING]: 0,
        [OrderStatus.PREPARING]: 0,
        [OrderStatus.READY]: 0,
        [OrderStatus.COMPLETED]: 0,
        [OrderStatus.CANCELLED]: 0,
    };

    Object.entries(statusBreakdown || {}).forEach(([status, count]) => {
        if (status in base) {
            base[status as OrderStatus] = Number(count);
        }
    });

    return base;
};

export const reportService = {
    async getOverview(filters?: ReportFilters): Promise<ReportOverview> {
        const params = new URLSearchParams();

        if (filters?.branchId) params.append('branchId', filters.branchId);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);

        const query = params.toString();
        const response = await apiClient.get<ReportOverview>(
            `/admin/reports/overview${query ? `?${query}` : ''}`
        );
        const data = response.data;

        return {
            ...data,
            totals: {
                ...data.totals,
                totalSales: normalizeNumber(data.totals.totalSales),
                netSales: normalizeNumber(data.totals.netSales),
                cancellationLoss: normalizeNumber(data.totals.cancellationLoss),
                totalOrders: normalizeNumber(data.totals.totalOrders),
                completedOrders: normalizeNumber(data.totals.completedOrders),
                cancelledOrders: normalizeNumber(data.totals.cancelledOrders),
                averageOrderValue: normalizeNumber(data.totals.averageOrderValue),
            },
            statusBreakdown: normalizeStatusBreakdown(data.statusBreakdown),
            branchBreakdown: data.branchBreakdown.map((branch) => ({
                ...branch,
                totalSales: normalizeNumber(branch.totalSales),
                cancellationLoss: normalizeNumber(branch.cancellationLoss),
                netSales: normalizeNumber(branch.netSales),
                averageOrderValue: normalizeNumber(branch.averageOrderValue),
                totalOrders: normalizeNumber(branch.totalOrders),
                completedOrders: normalizeNumber(branch.completedOrders),
                cancelledOrders: normalizeNumber(branch.cancelledOrders),
            })),
            topItems: data.topItems.map((item) => ({
                ...item,
                quantity: normalizeNumber(item.quantity),
                revenue: normalizeNumber(item.revenue),
            })),
            branchTopItems: data.branchTopItems.map((branch) => ({
                ...branch,
                items: branch.items.map((item) => ({
                    ...item,
                    quantity: normalizeNumber(item.quantity),
                    revenue: normalizeNumber(item.revenue),
                })),
            })),
            dailyTrend: data.dailyTrend.map((point) => ({
                ...point,
                sales: normalizeNumber(point.sales),
                orders: normalizeNumber(point.orders),
            })),
        };
    },
};
