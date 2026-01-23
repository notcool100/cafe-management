'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay, subHours, startOfWeek } from 'date-fns';
import { orderService } from '@/lib/api/order-service';
import { branchService } from '@/lib/api/branch-service';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Order, OrderStatus, Branch } from '@/lib/types';
import Toast from '@/components/ui/Toast';

type DateFilter = 'TODAY' | 'LAST_24H' | 'THIS_WEEK' | 'ALL';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchFilter, setBranchFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
    const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });

    const loadBranches = useCallback(async () => {
        try {
            const data = await branchService.getBranches();
            setBranches(data);
        } catch {
            setToast({ message: 'Unable to load branches', type: 'error', isVisible: true });
        }
    }, []);

    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const { startDate, endDate } = computeDates(dateFilter);
            const data = await orderService.getOrders({
                status: statusFilter === 'ALL' ? undefined : statusFilter,
                branchId: branchFilter === 'all' ? undefined : branchFilter,
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
    }, [branchFilter, dateFilter, statusFilter]);

    useEffect(() => {
        void loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        void loadOrders();
    }, [loadOrders]);

    const filteredOrders = useMemo(() => {
        // Already filtered on server; use this to sort/group
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
                    <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
                    <p className="text-gray-400">Filter by branch, status, and time window.</p>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full xl:w-auto">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-gray-500">Branch</span>
                        <div className="min-w-[220px]">
                            <Select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All branches' },
                                    ...branches.map((b) => ({ value: b.id, label: b.name })),
                                ]}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-gray-500">Status</span>
                        <div className="flex flex-wrap gap-2">
                            <FilterChip active={statusFilter === 'ALL'} label="All" onClick={() => setStatusFilter('ALL')} />
                            {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLATION_PENDING, OrderStatus.COMPLETED, OrderStatus.CANCELLED].map((status) => (
                                <FilterChip key={status} active={statusFilter === status} label={status} onClick={() => setStatusFilter(status)} />
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-gray-500">Date</span>
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
                    <Button variant="ghost" size="sm" onClick={() => loadOrders()} className="self-end">
                        Refresh
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <Card variant="glass">
                    <CardContent className="py-16 text-center">
                        <p className="text-gray-300 text-lg">No orders match these filters.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {Object.entries(groupedByDate).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                                <span className="text-xs text-gray-500 uppercase tracking-wide">{dateLabel}</span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {items.map((order) => (
                                    <OrderCard key={order.id} order={order} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function OrderCard({ order }: { order: Order }) {
    return (
        <Card variant="glass" hover>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-gray-500">#{order.id.slice(-6)}</span>
                        <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                    </div>
                    <span className="text-xs text-gray-400">{format(new Date(order.createdAt), 'HH:mm')}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Token</p>
                        <p className="text-2xl font-bold text-white">{order.tokenNumber ?? '--'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Branch</p>
                        <p className="text-white font-semibold">{order.branch?.name || '—'}</p>
                    </div>
                </div>
                <div className="flex justify-between text-sm text-gray-400">
                    <span>{order.items.reduce((acc, item) => acc + item.quantity, 0)} items</span>
                    <span className="text-white font-semibold">${order.totalAmount.toFixed(2)}</span>
                </div>
            </CardContent>
        </Card>
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

function statusVariant(status: OrderStatus) {
    switch (status) {
        case OrderStatus.READY:
        case OrderStatus.COMPLETED:
            return 'success';
        case OrderStatus.CANCELLED:
            return 'danger';
        case OrderStatus.CANCELLATION_PENDING:
            return 'warning';
        default:
            return 'default';
    }
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
