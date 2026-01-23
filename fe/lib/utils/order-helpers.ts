import { OrderStatus } from '../types';

export function getOrderStatusColor(status: OrderStatus): string {
    switch (status) {
        case OrderStatus.PENDING:
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case OrderStatus.PREPARING:
            return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        case OrderStatus.READY:
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        case OrderStatus.COMPLETED:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        case OrderStatus.CANCELLED:
            return 'bg-red-500/20 text-red-400 border-red-500/30';
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
}

export function getOrderStatusLabel(status: OrderStatus): string {
    switch (status) {
        case OrderStatus.PENDING:
            return 'Pending';
        case OrderStatus.PREPARING:
            return 'Preparing';
        case OrderStatus.READY:
            return 'Ready';
        case OrderStatus.COMPLETED:
            return 'Completed';
        case OrderStatus.CANCELLED:
            return 'Cancelled';
        default:
            return status;
    }
}

export function getNextOrderStatus(currentStatus: OrderStatus): OrderStatus | null {
    switch (currentStatus) {
        case OrderStatus.PENDING:
            return OrderStatus.PREPARING;
        case OrderStatus.PREPARING:
            return OrderStatus.READY;
        case OrderStatus.READY:
            return OrderStatus.COMPLETED;
        default:
            return null;
    }
}

export function canUpdateOrderStatus(currentStatus: OrderStatus): boolean {
    return currentStatus !== OrderStatus.COMPLETED && currentStatus !== OrderStatus.CANCELLED;
}
