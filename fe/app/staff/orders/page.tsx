'use client';

import { useEffect, useState, useRef } from 'react';
import { orderService } from '@/lib/api/order-service';
import { Order, OrderStatus } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import OrderDetailModal from '@/components/staff/OrderDetailModal';
import { format } from 'date-fns';

export default function ActiveOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadOrders = async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            const data = await orderService.getActiveOrders();
            setOrders(data);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders(true);

        // Auto refresh every 10 seconds
        refreshIntervalRef.current = setInterval(() => {
            loadOrders(false);
        }, 10000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, []);

    const filteredOrders = orders.filter(order =>
        filterStatus === 'ALL' || order.status === filterStatus
    );

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case OrderStatus.PREPARING: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
            case OrderStatus.READY: return 'bg-green-500/20 text-green-500 border-green-500/30';
            case OrderStatus.COMPLETED: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Active Orders</h1>
                    <p className="text-gray-400">Live view of kitchen and service status</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={filterStatus === 'ALL' ? 'primary' : 'outline'}
                        onClick={() => setFilterStatus('ALL')}
                        className={filterStatus === 'ALL' ? 'bg-white text-black hover:bg-white/90' : ''}
                    >
                        All
                    </Button>
                    {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY].map((status) => (
                        <Button
                            key={status}
                            size="sm"
                            variant={filterStatus === status ? 'primary' : 'outline'}
                            onClick={() => setFilterStatus(status)}
                        >
                            {status}
                        </Button>
                    ))}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => loadOrders(true)}
                        title="Refresh"
                    >
                        <RefreshIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
                    <p className="text-gray-400 text-lg mb-2">No active orders</p>
                    <p className="text-gray-600 text-sm">New orders will appear here automatically</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredOrders.map((order) => (
                        <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order.id)}
                            className={`
                                cursor-pointer group relative overflow-hidden rounded-xl border transition-all duration-200 hover:scale-[1.02] hover:shadow-lg
                                ${getStatusColor(order.status)} border
                            `}
                        >
                            <div className="p-5 flex flex-col h-full bg-gray-900/40 backdrop-blur-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-xs font-mono text-gray-400">
                                        #{order.id.slice(-4)}
                                    </span>
                                    <Badge size="sm" variant={
                                        order.status === OrderStatus.READY ? 'success' : 'default'
                                    }>
                                        {format(new Date(order.createdAt), 'HH:mm')}
                                    </Badge>
                                </div>

                                <div className="text-center my-4">
                                    <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">Token</p>
                                    <p className="text-5xl font-black text-white tracking-tight">
                                        {order.tokenNumber}
                                    </p>
                                </div>

                                <div className="mt-auto space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Items:</span>
                                        <span className="text-white font-medium">
                                            {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                                        </span>
                                    </div>
                                    <div className={`
                                        text-center py-1.5 rounded text-sm font-bold uppercase tracking-wide mt-2
                                        ${getStatusColor(order.status)} bg-opacity-10 border-none
                                    `}>
                                        {order.status}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <OrderDetailModal
                orderId={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdate={() => loadOrders(false)}
            />
        </div>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}
