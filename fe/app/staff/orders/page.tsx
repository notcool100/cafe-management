'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { format, startOfDay, subHours, startOfWeek } from 'date-fns';
import { orderService } from '@/lib/api/order-service';
import { menuService } from '@/lib/api/menu-service';
import { Order, OrderStatus, MenuItem } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import OrderDetailModal from '@/components/staff/OrderDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { useAuthStore } from '@/lib/store/auth-store';

export default function ActiveOrdersPage() {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuLoading, setMenuLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [dateFilter, setDateFilter] = useState<'TODAY' | 'LAST_24H' | 'THIS_WEEK' | 'ALL'>('TODAY');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });
    const [cartItems, setCartItems] = useState<
        { menuItemId: string; name: string; price: number; quantity: number }[]
    >([]);

    const loadOrders = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            const [activeOrders, completedOrders, cancelledOrders] = await Promise.all([
                orderService.getActiveOrders(),
                orderService.getOrdersByStatus(OrderStatus.COMPLETED),
                orderService.getOrdersByStatus(OrderStatus.CANCELLED),
            ]);
            setOrders([...activeOrders, ...completedOrders, ...cancelledOrders]);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    const loadMenuItems = useCallback(async () => {
        if (!user?.branchId) return;
        try {
            setMenuLoading(true);
            const items = await menuService.getMenuItems({ branchId: user.branchId, available: true });
            setMenuItems(items.map((item) => ({ ...item, price: Number(item.price) || 0 })));
            if (!selectedMenuItem && items.length) {
                setSelectedMenuItem(items[0].id);
            }
        } catch (error) {
            console.error('Failed to load menu items:', error);
            setToast({
                message: 'Unable to load menu items for this branch',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setMenuLoading(false);
        }
    }, [selectedMenuItem, user?.branchId]);

    useEffect(() => {
        loadOrders(true);

        refreshIntervalRef.current = setInterval(() => {
            loadOrders(false);
        }, 10000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [loadOrders]);

    useEffect(() => {
        loadMenuItems();
    }, [loadMenuItems]);

    const handleAddItem = () => {
        if (!selectedMenuItem) return;
        const quantity = Math.max(1, selectedQuantity);
        const menuItem = menuItems.find((item) => item.id === selectedMenuItem);
        if (!menuItem) return;
        const price = Number(menuItem.price) || 0;

        setCartItems((prev) => {
            const existing = prev.find((i) => i.menuItemId === selectedMenuItem);
            if (existing) {
                return prev.map((i) =>
                    i.menuItemId === selectedMenuItem
                        ? { ...i, quantity: i.quantity + quantity }
                        : i
                );
            }
            return [...prev, { menuItemId: menuItem.id, name: menuItem.name, price, quantity }];
        });
    };

    const handleUpdateQuantity = (menuItemId: string, qty: number) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.menuItemId === menuItemId ? { ...item, quantity: Math.max(1, qty) } : item
            )
        );
    };

    const handleRemoveItem = (menuItemId: string) => {
        setCartItems((prev) => prev.filter((item) => item.menuItemId !== menuItemId));
    };

    const handleCreateOrder = async () => {
        if (!user?.branchId) {
            setToast({
                message: 'You are not assigned to a branch.',
                type: 'error',
                isVisible: true,
            });
            return;
        }

        if (cartItems.length === 0) {
            setToast({
                message: 'Add at least one item to create an order.',
                type: 'error',
                isVisible: true,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await orderService.createOrder({
                branchId: user.branchId,
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                items: cartItems.map((item) => ({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                })),
            });

            setToast({
                message: 'Order created successfully',
                type: 'success',
                isVisible: true,
            });
            setCartItems([]);
            setCustomerName('');
            setCustomerPhone('');
            await loadOrders(false);
        } catch (error) {
            console.error('Failed to create order:', error);
            setToast({
                message: 'Failed to create order',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
    const totalAmount = cartItems.reduce((acc, item) => acc + item.quantity * item.price, 0);

    const isWithinDateFilter = (order: Order) => {
        if (dateFilter === 'ALL') return true;

        const created = new Date(order.createdAt);
        if (isNaN(created.getTime())) return true;

        const now = new Date();
        switch (dateFilter) {
            case 'TODAY':
                return created >= startOfDay(now);
            case 'LAST_24H':
                return created >= subHours(now, 24);
            case 'THIS_WEEK':
                return created >= startOfWeek(now, { weekStartsOn: 1 });
            default:
                return true;
        }
    };

    const filteredOrders = orders
        .filter(order => filterStatus === 'ALL' || order.status === filterStatus)
        .filter(isWithinDateFilter);

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING: return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
            case OrderStatus.PREPARING: return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
            case OrderStatus.READY: return 'bg-green-500/20 text-green-500 border-green-500/30';
            case OrderStatus.COMPLETED: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            case OrderStatus.CANCELLATION_PENDING: return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            case OrderStatus.CANCELLED: return 'bg-red-500/20 text-red-400 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-6">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Active Orders</h1>
                    <p className="text-gray-400">Create and manage in-house orders.</p>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full xl:w-auto">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wide text-gray-500">Status</span>
                        <div className="flex flex-wrap gap-2">
                            <FilterChip
                                active={filterStatus === 'ALL'}
                                label="All"
                                onClick={() => setFilterStatus('ALL')}
                            />
                            {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLATION_PENDING, OrderStatus.COMPLETED, OrderStatus.CANCELLED].map((status) => (
                                <FilterChip
                                    key={status}
                                    active={filterStatus === status}
                                    label={status}
                                    onClick={() => setFilterStatus(status)}
                                />
                            ))}
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => loadOrders(true)}
                                title="Refresh"
                                className="px-3"
                            >
                                <RefreshIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wide text-gray-500">Date</span>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: 'TODAY', label: 'Today' },
                                { key: 'LAST_24H', label: 'Last 24h' },
                                { key: 'THIS_WEEK', label: 'This week' },
                                { key: 'ALL', label: 'All' },
                            ].map(({ key, label }) => (
                                <FilterChip
                                    key={key}
                                    active={dateFilter === key}
                                    label={label}
                                    onClick={() => setDateFilter(key as any)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Card variant="glass">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <CardTitle>New Walk-in Order</CardTitle>
                        <p className="text-sm text-gray-500">Build an order for customers without QR scanning.</p>
                    </div>
                    <Badge variant="default">
                        Branch: {user?.branch?.name || user?.branchId || 'N/A'}
                    </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <Select
                            label="Menu item"
                            value={selectedMenuItem}
                            onChange={(e) => setSelectedMenuItem(e.target.value)}
                            options={menuItems.map((item) => ({
                                value: item.id,
                                label: `${item.name} — $${item.price.toFixed(2)}`,
                            }))}
                            disabled={menuLoading || menuItems.length === 0}
                        />
                        <Input
                            label="Quantity"
                            type="number"
                            min={1}
                            value={selectedQuantity}
                            onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                        />
                        <div className="flex items-end">
                            <Button
                                type="button"
                                onClick={handleAddItem}
                                disabled={menuItems.length === 0}
                                fullWidth
                            >
                                Add Item
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Customer name (optional)"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Walk-in"
                        />
                        <Input
                            label="Customer phone (optional)"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="For pickup updates"
                        />
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900/40">
                        <table className="w-full text-sm">
                            <thead className="text-gray-400 border-b border-gray-800">
                                <tr>
                                    <th className="text-left px-4 py-3">Item</th>
                                    <th className="text-right px-4 py-3">Price</th>
                                    <th className="text-center px-4 py-3">Qty</th>
                                    <th className="text-right px-4 py-3">Total</th>
                                    <th className="text-right px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cartItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center text-gray-500 py-6">
                                            Add items to start this order.
                                        </td>
                                    </tr>
                                ) : (
                                    cartItems.map((item) => (
                                        <tr key={item.menuItemId} className="border-b border-gray-800 last:border-0">
                                            <td className="px-4 py-3 text-white">{item.name}</td>
                                            <td className="px-4 py-3 text-right text-gray-200">${item.price.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuantity(item.menuItemId, Number(e.target.value))}
                                                    className="w-20 text-center"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right text-white font-semibold">
                                                ${(item.quantity * item.price).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveItem(item.menuItemId)}
                                                >
                                                    Remove
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="text-sm text-gray-400">
                            {totalItems} item{totalItems === 1 ? '' : 's'} • Ready to submit for kitchen
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-xl font-bold text-white">
                                Total: <span className="text-purple-400">${totalAmount.toFixed(2)}</span>
                            </div>
                            <Button
                                onClick={handleCreateOrder}
                                disabled={isSubmitting || cartItems.length === 0 || !user?.branchId}
                                isLoading={isSubmitting}
                            >
                                Create Order
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

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

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <Button
            size="sm"
            variant={active ? 'primary' : 'outline'}
            onClick={onClick}
            className={active ? 'shadow-lg shadow-purple-500/30' : ''}
        >
            {label}
        </Button>
    );
}
