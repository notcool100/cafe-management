'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay, startOfWeek, subHours } from 'date-fns';
import { orderService } from '@/lib/api/order-service';
import { branchService } from '@/lib/api/branch-service';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { Branch, Order, OrderStatus, OrderType, UserRole } from '@/lib/types';
import Toast from '@/components/ui/Toast';
import OrderDetailModal from '@/components/staff/OrderDetailModal';
import { useAuthStore } from '@/lib/store/auth-store';

type DateFilter = 'TODAY' | 'LAST_24H' | 'THIS_WEEK' | 'ALL';

export default function AdminOrdersPage() {
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;
    const managerBranchId = isManager ? user?.branchId : undefined;

    const [orders, setOrders] = useState<Order[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchFilter, setBranchFilter] = useState<string>(managerBranchId ?? 'all');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
    const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [modalOrderId, setModalOrderId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });

    const loadBranches = useCallback(async () => {
        try {
            const data = await branchService.getBranches();
            setBranches(data);

            if (managerBranchId) {
                setBranchFilter(managerBranchId);
            } else if (branchFilter === 'all' && data.length === 1) {
                setBranchFilter(data[0].id);
            }
        } catch {
            setToast({ message: 'Unable to load branches', type: 'error', isVisible: true });
        }
    }, [branchFilter, managerBranchId]);

    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const { startDate, endDate } = computeDates(dateFilter);
            const data = await orderService.getOrders({
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                branchId: branchFilter === 'all' ? managerBranchId || undefined : branchFilter,
                startDate,
                endDate,
            });
            setOrders(data);
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to load orders', type: 'error', isVisible: true });
        } finally {
            setIsLoading(false);
        }
    }, [branchFilter, dateFilter, managerBranchId, statusFilter]);

    useEffect(() => {
        void loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    const filteredOrders = useMemo(() => {
        return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [orders]);

    const groupedByDate = useMemo(() => {
        const buckets: Record<string, Order[]> = {};
        filteredOrders.forEach((order) => {
            const key = format(new Date(order.createdAt), 'PPP');
            buckets[key] = buckets[key] ? [...buckets[key], order] : [order];
        });
        return buckets;
    }, [filteredOrders]);

    useEffect(() => {
        if (!selectedOrderId && filteredOrders.length > 0) {
            setSelectedOrderId(filteredOrders[0].id);
            return;
        }

        if (selectedOrderId && !filteredOrders.some((order) => order.id === selectedOrderId)) {
            setSelectedOrderId(filteredOrders[0]?.id ?? null);
        }
    }, [filteredOrders, selectedOrderId]);

    const selectedOrder = useMemo(
        () => filteredOrders.find((order) => order.id === selectedOrderId) ?? null,
        [filteredOrders, selectedOrderId]
    );

    const selectedOrderSubtotal = useMemo(() => {
        if (!selectedOrder) return 0;
        return selectedOrder.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [selectedOrder]);

    const selectedOrderDelivery = useMemo(() => {
        if (!selectedOrder || selectedOrder.orderType !== OrderType.TAKEAWAY) return 0;
        return 25;
    }, [selectedOrder]);

    const selectedOrderHandling = useMemo(() => {
        if (!selectedOrder) return 0;
        return Math.max(selectedOrder.totalAmount - selectedOrderSubtotal - selectedOrderDelivery, 0);
    }, [selectedOrder, selectedOrderDelivery, selectedOrderSubtotal]);

    const handleShare = useCallback(async () => {
        if (!selectedOrder) return;

        const summary = `Order ${selectedOrder.id} - ${selectedOrder.customerName || 'Guest'} - ${formatCurrency(selectedOrder.totalAmount)}`;

        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share({
                    title: `Order #${selectedOrder.id.slice(-6)}`,
                    text: summary,
                });
                return;
            }
        } catch {
            // Ignore cancellation and continue to fallback.
        }

        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(summary);
                setToast({ message: 'Order summary copied', type: 'success', isVisible: true });
                return;
            }
        } catch {
            // Fall through to generic message.
        }

        setToast({ message: 'Share is not available on this device', type: 'info', isVisible: true });
    }, [selectedOrder]);

    const handlePrint = useCallback(async () => {
        if (!selectedOrder || typeof window === 'undefined') return;

        try {
            const billBlob = await orderService.generateBill(selectedOrder.id);
            const billUrl = window.URL.createObjectURL(billBlob);
            const printWindow = window.open(billUrl, '_blank');

            if (printWindow) {
                const tryPrint = () => {
                    try {
                        printWindow.focus();
                        printWindow.print();
                    } catch {
                        // Ignore print trigger failures (browser restrictions/plugins).
                    }
                };

                printWindow.addEventListener('load', tryPrint, { once: true });
                setTimeout(tryPrint, 700);
                setTimeout(() => window.URL.revokeObjectURL(billUrl), 60000);
                return;
            }

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = billUrl;

            iframe.onload = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } finally {
                    setTimeout(() => {
                        document.body.removeChild(iframe);
                        window.URL.revokeObjectURL(billUrl);
                    }, 5000);
                }
            };

            document.body.appendChild(iframe);
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to print bill', type: 'error', isVisible: true });
        }
    }, [selectedOrder]);

    return (
        <div className="space-y-5 bg-[#efe6d0] p-4 md:p-5 rounded-2xl border border-[#d2c4aa]">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[#4e2f27] mb-1">Orders</h1>
                <p className="text-[#6f584f]">All Orders</p>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 rounded-2xl border border-[#d7ccb2] bg-[#f3ebd8] p-3">
                <div>
                    <h2 className="text-sm font-semibold text-[#5e4338] uppercase tracking-wide">Filters</h2>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full xl:w-auto">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-[#6f584f]">Branch</span>
                        <div className="min-w-[220px]">
                            <Select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                options={
                                    isManager && managerBranchId
                                        ? branches
                                              .filter((b) => b.id === managerBranchId)
                                              .map((b) => ({ value: b.id, label: b.name }))
                                        : [
                                              { value: 'all', label: 'All branches' },
                                              ...branches.map((b) => ({ value: b.id, label: b.name })),
                                          ]
                                }
                                disabled={isManager}
                            />
                            {isManager && (
                                <p className="text-xs text-[#8a6c61] mt-1">Branch locked to your assignment.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-[#6f584f]">Status</span>
                        <div className="flex flex-wrap gap-2">
                            <FilterChip active={statusFilter === 'ALL'} label="All" onClick={() => setStatusFilter('ALL')} />
                            {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLATION_PENDING, OrderStatus.COMPLETED, OrderStatus.CANCELLED].map((status) => (
                                <FilterChip key={status} active={statusFilter === status} label={status} onClick={() => setStatusFilter(status)} />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-[#6f584f]">Date</span>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { key: 'TODAY', label: 'Today' },
                                { key: 'LAST_24H', label: 'Last 24h' },
                                { key: 'THIS_WEEK', label: 'This week' },
                                { key: 'ALL', label: 'All' },
                            ].map(({ key, label }) => (
                                <FilterChip key={key} active={dateFilter === key} label={label} onClick={() => setDateFilter(key as DateFilter)} />
                            ))}
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadOrders()}
                        className="self-end border-[#8a7d6a] text-[#4f4a40]"
                    >
                        Refresh
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <Card className="border border-[#d7ccb2] bg-[#efe7d2] shadow-sm">
                    <CardContent className="py-16 text-center">
                        <p className="text-[#6f584f] text-lg">No orders match these filters.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
                    <div className="rounded-2xl border-2 border-[#2f8fff] bg-[#efe7d2] p-3 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-3">
                            {Object.entries(groupedByDate).map(([dateLabel, items]) => (
                                <div key={dateLabel} className="space-y-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6f584f]">{dateLabel}</p>
                                    <div className="space-y-2">
                                        {items.map((order) => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                selected={order.id === selectedOrder?.id}
                                                onSelect={(id) => setSelectedOrderId(id)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="rounded-xl bg-[#633225] px-5 py-4 text-white shadow-lg">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#e6d8ca]">
                                            <span>Order ID #{selectedOrder.id.slice(-6)}</span>
                                            <span>{format(new Date(selectedOrder.createdAt), 'hh:mm a')}</span>
                                            <span>{format(new Date(selectedOrder.createdAt), 'dd MMM yyyy')}</span>
                                        </div>
                                        <h2 className="mt-2 text-3xl font-semibold leading-tight">
                                            {selectedOrder.customerName || 'Guest Customer'}
                                        </h2>
                                        <p className="mt-1 text-sm text-[#f1e6db]">{selectedOrder.branch?.name || 'No branch'}</p>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2">
                                        <Badge className="justify-center border-0 bg-[#9ae6b4] text-[#1f5a36] shadow-none">
                                            {statusLabel(selectedOrder.status)}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-white/30 bg-white text-[#4e2f27]"
                                            onClick={handleShare}
                                        >
                                            Share
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <div>
                                    <h3 className="mb-2 text-3xl font-semibold text-[#313f7f]">Order Details</h3>
                                    <div className="rounded-xl bg-[#633225] p-4 text-white shadow-lg">
                                        <p className="text-xl font-semibold">Bill Details</p>
                                        <div className="mt-4">
                                            <p className="text-xs uppercase tracking-wide text-[#e7d5c7]">Food Items</p>
                                            <div className="mt-2 space-y-2 text-sm">
                                                {selectedOrder.items.length === 0 ? (
                                                    <p className="text-[#e7d5c7]">No food items</p>
                                                ) : (
                                                    selectedOrder.items.map((item) => (
                                                        <div key={item.id} className="flex items-center justify-between gap-3">
                                                            <span className="truncate">
                                                                {item.menuItem?.name || 'Item'} x{item.quantity}
                                                            </span>
                                                            <span>{formatCurrency(item.price * item.quantity)}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div className="my-3 h-px bg-white/20" />
                                        <div className="mt-4 space-y-2 text-sm">
                                            <Row label="Subtotal" value={formatCurrency(selectedOrderSubtotal)} />
                                            <Row label="Handling Charge" value={formatCurrency(selectedOrderHandling)} />
                                            <Row label="Delivery Fee" value={formatCurrency(selectedOrderDelivery)} />
                                        </div>
                                        <div className="my-3 h-px bg-white/20" />
                                        <Row label="Total Bill" value={formatCurrency(selectedOrder.totalAmount)} strong />
                                        <p className="mt-2 text-xs text-[#e7d5c7]">Incl. all taxes and charges</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="mb-2 text-3xl font-semibold text-[#313f7f]">Billing Details</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className="w-full max-w-[190px] border-[#7d7a6a] bg-[#848374] text-white hover:bg-[#716f62]"
                                            onClick={handlePrint}
                                        >
                                            Print
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className="w-full max-w-[190px] border-[#633225] bg-[#633225] text-white hover:bg-[#4f291f]"
                                            onClick={() => setModalOrderId(selectedOrder.id)}
                                        >
                                            Manage Order
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <OrderDetailModal
                orderId={modalOrderId}
                onClose={() => setModalOrderId(null)}
                onUpdate={() => loadOrders()}
            />
        </div>
    );
}

function OrderCard({ order, selected, onSelect }: { order: Order; selected: boolean; onSelect: (orderId: string) => void }) {
    const lineItems = order.items.slice(0, 2);
    const extraItemsCount = Math.max(order.items.length - lineItems.length, 0);

    return (
        <button
            type="button"
            onClick={() => onSelect(order.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
                selected
                    ? 'border-[#2f8fff] bg-[#633225] shadow-lg'
                    : 'border-[#cdbfa8] bg-[#6d3a2a] hover:border-[#ab9980]'
            }`}
        >
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold text-[#f2ddca]">Order ID #{order.id.slice(-6)}</p>
                        <p className="mt-1 text-[11px] text-[#e7d5c8]">
                            {format(new Date(order.createdAt), 'hh:mm a')} | {format(new Date(order.createdAt), 'dd MMM yyyy')}
                        </p>
                    </div>
                    <Badge className="border-0 bg-white text-[#6d3a2a] shadow-none">{statusLabel(order.status)}</Badge>
                </div>

                <div>
                    <p className="text-3xl font-semibold leading-tight text-white">{order.customerName || 'Guest'}</p>
                </div>

                <div className="rounded-md bg-[#8b6654]/50 px-2 py-1">
                    <div className="space-y-1">
                        {lineItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs text-[#f4e8de]">
                                <span className="truncate max-w-[140px]">{item.menuItem?.name || 'Item'}</span>
                                <span>x{item.quantity}</span>
                            </div>
                        ))}
                        {extraItemsCount > 0 && (
                            <p className="text-[11px] text-[#f4e8de]">+{extraItemsCount} more</p>
                        )}
                    </div>
                </div>

                <div className="flex items-end justify-between text-xs text-[#f2ddca]">
                    <div>
                        <p>Branch</p>
                        <p className="text-sm font-semibold text-white">{order.branch?.name || '--'}</p>
                    </div>
                    <div className="text-right">
                        <p>Total</p>
                        <p className="text-sm font-semibold text-white">{formatCurrency(order.totalAmount)}</p>
                    </div>
                </div>
            </div>
        </button>
    );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <Button
            size="sm"
            variant={active ? 'secondary' : 'outline'}
            onClick={onClick}
            className={
                active
                    ? 'border border-[#633225] bg-[#633225] text-white shadow-md'
                    : 'border-[#c8bda7] bg-[#f5efdf] text-[#5e4338]'
            }
        >
            {label}
        </Button>
    );
}

function statusLabel(status: OrderStatus) {
    switch (status) {
        case OrderStatus.READY:
        case OrderStatus.COMPLETED:
            return 'Order Completed';
        case OrderStatus.CANCELLED:
            return 'Order Cancelled';
        case OrderStatus.CANCELLATION_PENDING:
            return 'Cancellation Pending';
        case OrderStatus.PREPARING:
            return 'Preparing';
        case OrderStatus.PENDING:
            return 'Pending';
        default:
            return status;
    }
}

function formatCurrency(value: number) {
    return `Rs ${value.toFixed(2)}`;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className={`flex items-center justify-between ${strong ? 'text-base font-semibold' : ''}`}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function computeDates(filter: DateFilter) {
    const now = new Date();
    switch (filter) {
        case 'TODAY':
            return { startDate: startOfDay(now).toISOString(), endDate: now.toISOString() };
        case 'LAST_24H':
            return { startDate: subHours(now, 24).toISOString(), endDate: now.toISOString() };
        case 'THIS_WEEK':
            return { startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), endDate: now.toISOString() };
        default:
            return {};
    }
}
