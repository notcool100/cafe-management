import apiClient from './api-client';
import { Order, CreateOrderData, OrderStatus, OrderFilters } from '../types';

const normalizeOrder = (order: Order): Order => ({
    ...order,
    items: order.items ?? [],
    totalAmount: typeof order.totalAmount === 'number'
        ? order.totalAmount
        : Number(order.totalAmount ?? 0),
});

const normalizeOrders = (orders: Order[]): Order[] => orders.map(normalizeOrder);

export const orderService = {
    async createOrder(data: CreateOrderData): Promise<Order> {
        const response = await apiClient.post<Order>('/orders', data);
        return normalizeOrder(response.data);
    },

    async getOrder(id: string): Promise<Order> {
        const response = await apiClient.get<Order>(`/orders/${id}`);
        return normalizeOrder(response.data);
    },

    async getOrders(filters?: OrderFilters): Promise<Order[]> {
        const params = new URLSearchParams();

        if (filters?.status) params.append('status', filters.status);
        if (filters?.branchId) params.append('branchId', filters.branchId);
        if (filters?.search) params.append('search', filters.search);

        const response = await apiClient.get<Order[]>(`/orders?${params.toString()}`);
        return normalizeOrders(response.data);
    },

    async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
        const response = await apiClient.put<Order>(`/orders/${id}/status`, { status });
        return normalizeOrder(response.data);
    },

    // Staff endpoints
    async getActiveOrders(): Promise<Order[]> {
        const response = await apiClient.get<Order[]>('/staff/orders/active');
        return normalizeOrders(response.data);
    },

    async getOrdersByStatus(status: OrderStatus): Promise<Order[]> {
        const response = await apiClient.get<Order[]>(`/staff/orders/status/${status}`);
        return normalizeOrders(response.data);
    },

    async completeOrder(id: string): Promise<Order> {
        const response = await apiClient.put<Order>(`/staff/orders/${id}/complete`);
        return normalizeOrder(response.data);
    },

    async generateKOT(id: string): Promise<Blob> {
        const response = await apiClient.get(`/staff/orders/${id}/kot`, {
            responseType: 'blob',
        });
        return response.data;
    },

    async generateBill(id: string): Promise<Blob> {
        const response = await apiClient.get(`/staff/orders/${id}/bill`, {
            responseType: 'blob',
        });
        return response.data;
    },

    // Utility to download PDF
    downloadPDF(blob: Blob, filename: string) {
        if (typeof window === 'undefined') return;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};
