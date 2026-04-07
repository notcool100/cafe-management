import axios from 'axios';
import apiClient from './api-client';
import { API_BASE_URL } from './base-url';
import {
    Order,
    CreateOrderData,
    PaymentMethod,
    OrderStatus,
    OrderFilters,
    OrderItem,
    SharedItemNotification,
    OrderNotification,
} from '../types';

const normalizeOrder = (order: Order): Order => {
    const rawItems = ((order as unknown as { items?: OrderItem[]; orderItems?: OrderItem[] }).items ??
        (order as unknown as { items?: OrderItem[]; orderItems?: OrderItem[] }).orderItems ??
        []) as Array<Partial<OrderItem> & { price?: number | string }>;

    const items = rawItems.map((item) => ({
        ...item,
        price: typeof item.price === 'number' ? item.price : Number(item.price ?? 0),
    })) as OrderItem[];
    const totalAmount = typeof order.totalAmount === 'number'
        ? order.totalAmount
        : Number(order.totalAmount ?? 0);
    const subtotalAmount = typeof order.subtotalAmount === 'number'
        ? order.subtotalAmount
        : Number(order.subtotalAmount ?? totalAmount);
    const discountPercentage = typeof order.discountPercentage === 'number'
        ? order.discountPercentage
        : Number(order.discountPercentage ?? 0);
    const discountAmount = typeof order.discountAmount === 'number'
        ? order.discountAmount
        : Number(order.discountAmount ?? 0);
    const paymentMethod = normalizePaymentMethod(
        (order as unknown as { paymentMethod?: PaymentMethod | string }).paymentMethod
    );

    return {
        ...order,
        items,
        subtotalAmount,
        totalAmount,
        discountPercentage,
        discountAmount,
        paymentMethod,
    };
};

const normalizeOrders = (orders: Order[]): Order[] => orders.map(normalizeOrder);

const normalizePaymentMethod = (paymentMethod?: PaymentMethod | string): PaymentMethod | undefined => {
    switch (paymentMethod) {
        case 'CASH':
        case PaymentMethod.CASH_PAYMENT:
            return PaymentMethod.CASH_PAYMENT;
        case PaymentMethod.CREDIT_CARD:
            return PaymentMethod.CREDIT_CARD;
        case PaymentMethod.DEBIT_CARD:
            return PaymentMethod.DEBIT_CARD;
        case PaymentMethod.FONEPAY:
            return PaymentMethod.FONEPAY;
        case PaymentMethod.UPI:
            return PaymentMethod.UPI;
        default:
            return undefined;
    }
};

// Public client avoids auth headers/redirects for customer flows (menu/checkout/token)
const publicClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const orderService = {
    async createOrder(data: CreateOrderData): Promise<Order> {
        const response = await publicClient.post<Order>('/orders', data);
        return normalizeOrder(response.data);
    },

    async createStaffOrder(data: CreateOrderData): Promise<Order> {
        const response = await apiClient.post<Order>('/staff/orders', data);
        return normalizeOrder(response.data);
    },

    async getOrder(id: string): Promise<Order> {
        const response = await publicClient.get<Order>(`/orders/${id}`);
        return normalizeOrder(response.data);
    },

    async getOrders(filters?: OrderFilters): Promise<Order[]> {
        const params = new URLSearchParams();

        if (filters?.status) params.append('status', filters.status);
        if (filters?.branchId) params.append('branchId', filters.branchId);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);

        const response = await apiClient.get<Order[]>(`/orders?${params.toString()}`);
        return normalizeOrders(response.data);
    },

    async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
        const response = await apiClient.put<Order>(`/orders/${id}/status`, { status });
        return normalizeOrder(response.data);
    },

    async cancelOrder(id: string): Promise<Order> {
        return this.updateOrderStatus(id, OrderStatus.CANCELLED);
    },

    async getOrdersByDevice(deviceId: string): Promise<Order[]> {
        const response = await publicClient.get<Order[]>(`/orders/device/${deviceId}`);
        return normalizeOrders(response.data);
    },

    // Staff endpoints
    async getActiveOrders(branchId?: string): Promise<Order[]> {
        const url = branchId ? `/staff/orders/active?branchId=${branchId}` : '/staff/orders/active';
        const response = await apiClient.get<Order[]>(url);
        return normalizeOrders(response.data);
    },

    async getOrdersByStatus(status: OrderStatus, branchId?: string): Promise<Order[]> {
        const url = `/staff/orders/status/${status}${branchId ? `?branchId=${branchId}` : ''}`;
        const response = await apiClient.get<Order[]>(url);
        return normalizeOrders(response.data);
    },

    async completeOrder(id: string): Promise<Order> {
        const response = await apiClient.put<Order>(`/staff/orders/${id}/complete`);
        return normalizeOrder(response.data);
    },

    async undoCancellation(id: string): Promise<Order> {
        const response = await apiClient.put<Order>(`/staff/orders/${id}/undo-cancel`);
        return normalizeOrder(response.data);
    },

    async generateKOT(id: string): Promise<Blob> {
        const response = await apiClient.get(`/staff/orders/${id}/kot?t=${Date.now()}`, {
            responseType: 'blob',
            headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
            },
        });
        return response.data;
    },

    async generateBill(id: string): Promise<Blob> {
        const response = await apiClient.get(`/staff/orders/${id}/bill?t=${Date.now()}`, {
            responseType: 'blob',
            headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
            },
        });
        return response.data;
    },

    async getSharedItemNotifications(since?: string): Promise<SharedItemNotification[]> {
        const params = new URLSearchParams();
        if (since) params.append('since', since);
        const suffix = params.toString();
        const response = await apiClient.get<SharedItemNotification[]>(
            `/staff/notifications/shared-items${suffix ? `?${suffix}` : ''}`
        );
        return response.data;
    },

    async getOrderNotifications(since?: string): Promise<OrderNotification[]> {
        const params = new URLSearchParams();
        if (since) params.append('since', since);
        const suffix = params.toString();
        const response = await apiClient.get<OrderNotification[]>(
            `/staff/notifications/orders${suffix ? `?${suffix}` : ''}`
        );
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
