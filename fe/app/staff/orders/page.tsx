'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { format, startOfDay, startOfWeek, subHours } from 'date-fns';
import { orderService } from '@/lib/api/order-service';
import { menuService } from '@/lib/api/menu-service';
import { categoryService } from '@/lib/api/category-service';
import { Order, OrderStatus, MenuItem, OrderType, SharedItemNotification, Category } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import OrderDetailModal from '@/components/staff/OrderDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { useAuthStore } from '@/lib/store/auth-store';
import { resolveImageUrl } from '@/lib/utils/image';

type CartLine = {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    category?: string;
};

type DateFilter = 'TODAY' | 'LAST_24H' | 'THIS_WEEK' | 'ALL';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: 'TODAY', label: 'Today' },
    { key: 'LAST_24H', label: 'Last 24h' },
    { key: 'THIS_WEEK', label: 'This week' },
    { key: 'ALL', label: 'All' },
];

const staffOrdersTextTheme = {
    '--text-primary': '#000000',
    '--text-muted': '#111111',
} as React.CSSProperties;

const statusTone: Record<OrderStatus, { badge: string; chip: string; text: string; border: string }> = {
    [OrderStatus.PENDING]: {
        badge: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
        chip: 'bg-amber-500/10 text-amber-200 border border-amber-400/20',
        text: 'text-amber-200',
        border: 'border-amber-400/30',
    },
    [OrderStatus.PREPARING]: {
        badge: 'bg-blue-500/15 text-blue-200 border border-blue-400/30',
        chip: 'bg-blue-500/10 text-blue-200 border border-blue-400/20',
        text: 'text-blue-200',
        border: 'border-blue-400/30',
    },
    [OrderStatus.READY]: {
        badge: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
        chip: 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/20',
        text: 'text-emerald-200',
        border: 'border-emerald-400/30',
    },
    [OrderStatus.COMPLETED]: {
        badge: 'bg-gray-500/10 text-gray-200 border border-gray-500/30',
        chip: 'bg-gray-500/10 text-gray-200 border border-gray-400/20',
        text: 'text-gray-200',
        border: 'border-gray-500/30',
    },
    [OrderStatus.CANCELLED]: {
        badge: 'bg-red-500/15 text-red-200 border border-red-400/30',
        chip: 'bg-red-500/10 text-red-200 border border-red-400/20',
        text: 'text-red-200',
        border: 'border-red-400/30',
    },
    [OrderStatus.CANCELLATION_PENDING]: {
        badge: 'bg-amber-500/15 text-amber-100 border border-amber-400/30',
        chip: 'bg-amber-500/10 text-amber-100 border border-amber-400/20',
        text: 'text-amber-100',
        border: 'border-amber-400/30',
    },
};

export default function ActiveOrdersPage() {
    const { user } = useAuthStore();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuLoading, setMenuLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>(OrderStatus.PENDING);
    const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [sharedNotifySince, setSharedNotifySince] = useState<string | null>(null);
    const [sharedNotifications, setSharedNotifications] = useState<SharedItemNotification[]>([]);
    const [notifyLastSeenAt, setNotifyLastSeenAt] = useState<string | null>(null);
    const [isNotifyOpen, setIsNotifyOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });
    const [cartItems, setCartItems] = useState<CartLine[]>([]);
    const [isCompact, setIsCompact] = useState(false); // tablets & mobile toggle view
    const [activeSection, setActiveSection] = useState<'BUILD' | 'ORDERS'>('BUILD');

    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const notifyPanelRef = useRef<HTMLDivElement | null>(null);
    const sharedNotifyKey = user?.branchId ? `shared-item-notify-since:${user.branchId}` : 'shared-item-notify-since';
    const sharedNotifyHistoryKey = user?.branchId ? `shared-item-notify-history:${user.branchId}` : 'shared-item-notify-history';
    const sharedNotifyLastSeenKey = user?.branchId ? `shared-item-notify-last-seen:${user.branchId}` : 'shared-item-notify-last-seen';

    const unreadSharedCount = useMemo(() => {
        if (!sharedNotifications.length) return 0;
        if (!notifyLastSeenAt) return sharedNotifications.length;
        const lastSeen = new Date(notifyLastSeenAt).getTime();
        return sharedNotifications.filter((notification) => new Date(notification.completedAt).getTime() > lastSeen).length;
    }, [notifyLastSeenAt, sharedNotifications]);

    const loadOrders = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            const [activeOrders, completedOrders, cancelledOrders] = await Promise.all([
                orderService.getActiveOrders(),
                orderService.getOrdersByStatus(OrderStatus.COMPLETED),
                orderService.getOrdersByStatus(OrderStatus.CANCELLED),
            ]);
            setOrders([...activeOrders, ...completedOrders, ...cancelledOrders]);
        } catch {
            // intentionally silent for kiosk friendliness
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, []);

    const loadSharedNotifications = useCallback(async () => {
        if (!user?.branchId || !sharedNotifySince) return;
        try {
            const notifications = await orderService.getSharedItemNotifications(sharedNotifySince);
            if (notifications.length === 0) return;

            const latest = notifications.reduce((current, next) => {
                const currentTime = new Date(current.completedAt).getTime();
                const nextTime = new Date(next.completedAt).getTime();
                return nextTime > currentTime ? next : current;
            });

            const newSince = latest.completedAt;
            setSharedNotifySince(newSince);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(sharedNotifyKey, newSince);
            }

            setSharedNotifications((prev) => {
                const combined = [...notifications, ...prev];
                const seen = new Set<string>();
                const unique = combined.filter((item) => {
                    const key = `${item.orderId}-${item.completedAt}-${item.orderBranchId}-${item.itemNames.join('|')}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
                unique.sort(
                    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
                );
                const trimmed = unique.slice(0, 30);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(sharedNotifyHistoryKey, JSON.stringify(trimmed));
                }
                return trimmed;
            });

            const latestBranch = latest.orderBranchName || 'another branch';
            const itemSummary = latest.itemNames.slice(0, 3).join(', ');
            const extraCount = Math.max(0, latest.itemNames.length - 3);
            const itemLabel = extraCount > 0 ? `${itemSummary} +${extraCount} more` : itemSummary;

            const message = notifications.length === 1
                ? `Shared items used at ${latestBranch}: ${itemLabel}`
                : `${notifications.length} completed orders used your items. Latest: ${latestBranch} (${itemLabel})`;

            setToast({
                message,
                type: 'info',
                isVisible: true,
            });
        } catch {
            // silently ignore notification errors
        }
    }, [sharedNotifyHistoryKey, sharedNotifyKey, sharedNotifySince, user?.branchId]);

    const handleToggleNotifications = () => {
        setIsNotifyOpen((prev) => {
            const next = !prev;
            if (next) {
                const now = new Date().toISOString();
                setNotifyLastSeenAt(now);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(sharedNotifyLastSeenKey, now);
                }
            }
            return next;
        });
    };

    const loadMenuItems = useCallback(async () => {
        if (!user?.branchId) return;
        try {
            setMenuLoading(true);
            const items = await menuService.getMenuItems({ branchId: user.branchId, available: true });
            setMenuItems(items.map((item) => ({ ...item, price: Number(item.price) || 0 })));
        } catch {
            setToast({
                message: 'Unable to load menu items for this branch',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setMenuLoading(false);
        }
    }, [user?.branchId]);

    const loadCategories = useCallback(async () => {
        if (!user?.branchId) return;
        try {
            const data = await categoryService.getCategories(user.branchId);
            setCategories(data);
        } catch {
            // silently ignore category load failures to avoid blocking orders
            setCategories([]);
        }
    }, [user?.branchId]);

    useEffect(() => {
        if (typeof window === 'undefined' || !user?.branchId) return;

        const storedSince = window.localStorage.getItem(sharedNotifyKey);
        if (storedSince) {
            setSharedNotifySince(storedSince);
        } else {
            const now = new Date().toISOString();
            window.localStorage.setItem(sharedNotifyKey, now);
            setSharedNotifySince(now);
        }

        const storedHistory = window.localStorage.getItem(sharedNotifyHistoryKey);
        if (storedHistory) {
            try {
                const parsed = JSON.parse(storedHistory) as SharedItemNotification[];
                if (Array.isArray(parsed)) {
                    setSharedNotifications(parsed);
                }
            } catch {
                // ignore corrupted history
            }
        }

        const storedLastSeen = window.localStorage.getItem(sharedNotifyLastSeenKey);
        if (storedLastSeen) {
            setNotifyLastSeenAt(storedLastSeen);
        } else {
            const now = new Date().toISOString();
            window.localStorage.setItem(sharedNotifyLastSeenKey, now);
            setNotifyLastSeenAt(now);
        }
    }, [sharedNotifyHistoryKey, sharedNotifyKey, sharedNotifyLastSeenKey, user?.branchId]);

    useEffect(() => {
        if (!isNotifyOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (notifyPanelRef.current && !notifyPanelRef.current.contains(event.target as Node)) {
                setIsNotifyOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isNotifyOpen]);

    useEffect(() => {
        loadOrders(true);
        loadSharedNotifications();

        refreshIntervalRef.current = setInterval(() => {
            loadOrders(false);
            loadSharedNotifications();
        }, 10000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [loadOrders, loadSharedNotifications]);

    useEffect(() => {
        loadMenuItems();
    }, [loadMenuItems]);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1023px)'); // up to lg breakpoint
        const handler = (e: MediaQueryListEvent | MediaQueryList) => {
            const matches = e.matches;
            setIsCompact(matches);
            if (!matches) {
                setActiveSection('BUILD');
            }
        };
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    const handleAddItem = (menuItem: MenuItem, quantity = 1) => {
        if (!menuItem?.id) return;
        const qty = Math.max(1, quantity);
        const price = Number(menuItem.price) || 0;

        setCartItems((prev) => {
            const existing = prev.find((i) => i.menuItemId === menuItem.id);
            if (existing) {
                return prev.map((i) =>
                    i.menuItemId === menuItem.id
                        ? { ...i, quantity: i.quantity + qty }
                        : i
                );
            }
            return [...prev, {
                menuItemId: menuItem.id,
                name: menuItem.name,
                price,
                quantity: qty,
                imageUrl: menuItem.imageUrl,
                category: menuItem.category,
            }];
        });
    };

    const handleUpdateQuantity = (menuItemId: string, qty: number) => {
        if (qty < 1) {
            handleRemoveItem(menuItemId);
            return;
        }
        setCartItems((prev) =>
            prev.map((item) =>
                item.menuItemId === menuItemId
                    ? { ...item, quantity: qty }
                    : item
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
                orderType,
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
            setOrderType(OrderType.DINE_IN);
            await loadOrders(false);
        } catch {
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

    const menuLookup = useMemo(() => {
        const lookup: Record<string, MenuItem> = {};
        menuItems.forEach((item) => {
            lookup[item.id] = item;
        });
        return lookup;
    }, [menuItems]);

    const availableCategories = useMemo(() => {
        const unique = new Set<string>();
        categories.forEach((category) => {
            const value = category.name?.trim();
            if (value) unique.add(value);
        });
        menuItems.forEach((item) => {
            if (!item.category) return;
            const value = item.category.trim();
            if (value) unique.add(value);
        });
        return ['ALL', ...Array.from(unique)];
    }, [categories, menuItems]);

    useEffect(() => {
        if (categoryFilter === 'ALL') return;
        if (!availableCategories.includes(categoryFilter)) {
            setCategoryFilter('ALL');
        }
    }, [availableCategories, categoryFilter]);

    const filteredMenuItems = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return menuItems.filter((item) => {
            const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
            const matchesSearch = term
                ? item.name.toLowerCase().includes(term) ||
                (item.description || '').toLowerCase().includes(term)
                : true;
            return matchesCategory && matchesSearch;
        });
    }, [menuItems, categoryFilter, searchTerm]);

    const isWithinDateFilter = useCallback((order: Order) => {
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
    }, [dateFilter]);

    const filteredOrders = useMemo(() => (
        orders
            .filter(order => filterStatus === 'ALL' || order.status === filterStatus)
            .filter(isWithinDateFilter)
    ), [orders, filterStatus, isWithinDateFilter]);

    const hasCart = cartItems.length > 0;

    return (
        <div className="space-y-6" style={staffOrdersTextTheme}>
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-white">Staff Orders</h1>
                    <p className="text-gray-400">PathoFood-like simple flow for quick walk-in orders.</p>
                </div>
                <div className="relative" ref={notifyPanelRef}>
                    <button
                        type="button"
                        onClick={handleToggleNotifications}
                        aria-label="Shared item notifications"
                        aria-expanded={isNotifyOpen}
                        className="relative flex items-center gap-2 rounded-full border border-[#cbbda8] bg-[#fffaf0] px-3 py-2 text-sm font-semibold text-[#4e2f27] shadow-sm hover:bg-[#f8efe1]"
                    >
                        <BellIcon className="h-5 w-5 text-[#4e2f27]" />
                        <span>Notifications</span>
                        {unreadSharedCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#b45309] px-1 text-[11px] font-bold text-white">
                                {unreadSharedCount > 9 ? '9+' : unreadSharedCount}
                            </span>
                        )}
                    </button>

                    {isNotifyOpen && (
                        <div className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#e4d7c2] bg-[#fffaf0] p-3 shadow-xl z-30">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-semibold text-[#4e2f27]">Shared Item History</p>
                                <span className="text-xs text-[#8a6c61]">{sharedNotifications.length} total</span>
                            </div>
                            <div className="max-h-[320px] overflow-y-auto space-y-2">
                                {sharedNotifications.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[#e4d7c2] bg-[#f8efe1] p-3 text-xs text-[#8a6c61]">
                                        No shared item activity yet.
                                    </div>
                                ) : (
                                    sharedNotifications.map((notification) => {
                                        const completedAt = new Date(notification.completedAt);
                                        const timeLabel = isNaN(completedAt.getTime())
                                            ? ''
                                            : format(completedAt, 'PP p');
                                        const branchLabel = notification.orderBranchName || 'another branch';
                                        const itemsLabel = notification.itemNames.length
                                            ? notification.itemNames.join(', ')
                                            : 'Shared item';
                                        const isUnread = !notifyLastSeenAt
                                            || new Date(notification.completedAt).getTime() > new Date(notifyLastSeenAt).getTime();

                                        return (
                                            <div
                                                key={`${notification.orderId}-${notification.completedAt}`}
                                                className={`rounded-xl border p-3 text-xs ${
                                                    isUnread
                                                        ? 'border-[#b45309] bg-[#fff4d6]'
                                                        : 'border-[#e4d7c2] bg-[#f8efe1]'
                                                }`}
                                            >
                                                <p className="text-sm font-semibold text-[#4e2f27]" title={itemsLabel}>
                                                    {itemsLabel}
                                                </p>
                                                <p className="mt-1 text-[11px] text-[#7a6a5f]">
                                                    Used at {branchLabel}
                                                </p>
                                                {timeLabel && (
                                                    <p className="text-[11px] text-[#9a8577]">{timeLabel}</p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isCompact && (
                <div className="flex gap-2 rounded-xl bg-gray-900/80 border border-gray-800 p-2 sticky top-2 z-30">
                    {(['BUILD', 'ORDERS'] as const).map((tab) => (
                        <Button
                            key={tab}
                            size="sm"
                            variant={activeSection === tab ? 'primary' : 'outline'}
                            className="flex-1"
                            onClick={() => setActiveSection(tab)}
                        >
                            {tab === 'BUILD' ? 'New Order' : 'Live Orders'}
                        </Button>
                    ))}
                </div>
            )}

            <div className={`${isCompact ? '' : 'grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4'}`}>
                {(!isCompact || activeSection === 'BUILD') && (
                    <Card id="build-section" variant="glass" className="shadow-xl border border-gray-800/60">
                        <CardHeader className="flex flex-col gap-1">
                            <CardTitle>Build Order</CardTitle>
                            <p className="text-sm text-gray-500">Tap an item to add, keep the cart on the right in view.</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                <div className="flex-1">
                                    <div className="relative">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white-500" />
                                        <input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full rounded-xl border border-gray-800 bg-gray-900/60 pl-9 pr-4 py-3 text-sm text-white placeholder:text-white-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
                                            placeholder="Search menu or notes"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {availableCategories.map((cat) => (
                                        <FilterChip
                                            key={cat}
                                            active={categoryFilter === cat}
                                            label={cat === 'ALL' ? 'All' : formatCategoryLabel(cat)}
                                            onClick={() => setCategoryFilter(cat)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {menuLoading ? (
                                <div className="flex justify-center py-16">
                                    <Spinner size="lg" />
                                </div>
                            ) : filteredMenuItems.length === 0 ? (
                                <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl bg-gray-900/40">
                                    <p className="text-gray-400">No menu items match your filters.</p>
                                    <p className="text-gray-500 text-sm">Clear search or switch category.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {filteredMenuItems.map((item) => {
                                        const existing = cartItems.find((c) => c.menuItemId === item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className="group rounded-2xl border border-white-800 bg-white-900/50 overflow-hidden flex flex-col shadow-sm hover:border-red-500/50 transition-all"
                                            >
                                                <div className="aspect-[4/3] relative bg-white-800">
                                                    {resolveImageUrl(item.imageUrl) ? (
                                                        <Image
                                                            src={resolveImageUrl(item.imageUrl) as string}
                                                            alt={item.name}
                                                            fill
                                                            sizes="(max-width: 1280px) 50vw, 33vw"
                                                            className="object-cover"
                                                            priority={false}
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                            <ImageIcon className="h-10 w-10" />
                                                        </div>
                                                    )}
                                                    <div className="absolute top-3 left-3">
                                                        <span
                                                            className="px-3 py-1 text-xs font-semibold rounded-full bg-black/60 border border-white/10 backdrop-blur-sm"
                                                            style={{ color: '#ffffff' }}
                                                        >
                                                            Rs. {item.price.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="absolute top-3 right-3">
                                                        <Badge variant="default" size="sm" style={{ color: '#ffffff' }}>
                                                            {formatCategoryLabel(item.category)}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="p-4 flex flex-col gap-2 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <h3 className="text-white font-semibold leading-tight line-clamp-1">{item.name}</h3>
                                                        {!item.available && (
                                                            <Badge variant="danger" size="sm">Sold Out</Badge>
                                                        )}
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-sm text-gray-400 line-clamp-2 flex-1">{item.description}</p>
                                                    )}
                                                    <div className="flex items-center justify-between pt-1">
                                                        {/* <span className="text-sm text-gray-400">Tap to add to order</span> */}
                                                        {existing ? (
                                                            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/30 px-2 py-1">
                                                                <IconButton
                                                                    ariaLabel="Decrease"
                                                                    onClick={() => handleUpdateQuantity(item.id, existing.quantity - 1)}
                                                                >
                                                                    <MinusIcon className="h-4 w-4" />
                                                                </IconButton>
                                                                <span className="text-white font-semibold text-sm min-w-[1.5rem] text-center">{existing.quantity}</span>
                                                                <IconButton
                                                                    ariaLabel="Increase"
                                                                    onClick={() => handleAddItem(item, 1)}
                                                                >
                                                                    <PlusIcon className="h-4 w-4" />
                                                                </IconButton>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                variant="primary"
                                                                onClick={() => handleAddItem(item)}
                                                                disabled={!item.available}
                                                            >
                                                                Add
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {(!isCompact || activeSection === 'BUILD') && (
                    <Card id="order-summary" variant="glass" className="shadow-xl border border-gray-800/60">
                        <CardHeader className="flex flex-col gap-1">
                            <CardTitle>Order Summary</CardTitle>
                            <p className="text-sm text-gray-500">Cart with item photos, quantities, and total at a glance.</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                {[OrderType.DINE_IN, OrderType.TAKEAWAY].map((type) => (
                                    <FilterChip
                                        key={type}
                                        active={orderType === type}
                                        label={type === OrderType.DINE_IN ? 'Dine-in (token)' : 'Takeaway'}
                                        onClick={() => setOrderType(type)}
                                    />
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input
                                    label="Customer name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Walk-in guest"
                                />
                                <Input
                                    label="Customer phone"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="For pickup updates"
                                />
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-white-900/60 divide-y divide-gray-800 max-h-[360px] overflow-y-auto">
                                {!hasCart ? (
                                    <div className="p-6 text-center text-gray-500">
                                        <p className="text-base">Add items from the menu to start an order.</p>
                                        <p className="text-sm text-gray-600 mt-1">Images appear here for quick visual checks.</p>
                                    </div>
                                ) : (
                                    cartItems.map((item) => (
                                        <div key={item.menuItemId} className="p-3 flex items-center gap-3">
                                            <ImageThumb src={resolveImageUrl(item.imageUrl)} label={item.name} />
                                            <div className="flex-1">
                                                <p className="text-white font-semibold leading-tight">{item.name}</p>
                                                <p className="text-xs text-gray-400">{formatCategoryLabel(item.category)} • Rs. {item.price.toFixed(2)}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <IconButton
                                                    ariaLabel="Decrease"
                                                    onClick={() => handleUpdateQuantity(item.menuItemId, item.quantity - 1)}
                                                >
                                                    <MinusIcon className="h-4 w-4" />
                                                </IconButton>
                                                <span className="text-white font-semibold min-w-[1.5rem] text-center">{item.quantity}</span>
                                                <IconButton
                                                    ariaLabel="Increase"
                                                    onClick={() => handleUpdateQuantity(item.menuItemId, item.quantity + 1)}
                                                >
                                                    <PlusIcon className="h-4 w-4" />
                                                </IconButton>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-300">Rs. {item.price.toFixed(2)}</p>
                                                <p className="text-base font-semibold text-white">Rs. {(item.price * item.quantity).toFixed(2)}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveItem(item.menuItemId)}
                                                className="text-red-500 hover:text-red-400 transition"
                                                aria-label="Remove"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="text-sm text-gray-400">
                                    {totalItems} item{totalItems === 1 ? '' : 's'} • {orderType === OrderType.TAKEAWAY ? 'No token needed' : 'Token will be generated'}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-white">
                                        Total: <span className="text-purple-400">Rs. {totalAmount.toFixed(2)}</span>
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
                )}
            </div>

            {isCompact && (
                <MobileFooterBar
                    hasCart={hasCart}
                    totalAmount={totalAmount}
                    onSubmit={handleCreateOrder}
                    submitting={isSubmitting}
                    onViewOrders={() => setActiveSection('ORDERS')}
                />
            )}

            {(!isCompact || activeSection === 'ORDERS') && (
                <div className="space-y-4" id="orders-section">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Live Orders</h2>
                            <p className="text-sm text-gray-500">Tap a card to update or print. Keeps refreshing every 10s.</p>
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3 w-full xl:w-auto">
                            <div className="flex flex-wrap gap-2">
                                <FilterChip
                                    active={filterStatus === 'ALL'}
                                    label="All"
                                    onClick={() => setFilterStatus('ALL')}
                                />
                                {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED].map((status) => (
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
                            <div className="flex flex-wrap gap-2">
                                {DATE_FILTERS.map(({ key, label }) => (
                                    <FilterChip
                                        key={key}
                                        active={dateFilter === key}
                                        label={label}
                                        onClick={() => setDateFilter(key)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Spinner size="lg" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
                            <p className="text-gray-400 text-lg mb-2">No orders in this view</p>
                            <p className="text-gray-600 text-sm">New orders will appear here automatically.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                            {filteredOrders.map((order) => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onClick={() => setSelectedOrder(order.id)}
                                    lookup={menuLookup}
                                />
                            ))}
                        </div>
                    )}
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

function OrderCard({ order, onClick, lookup }: { order: Order; onClick: () => void; lookup: Record<string, MenuItem> }) {
    const tone = statusTone[order.status] || statusTone[OrderStatus.PENDING];
    const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const thumbnails = order.items.slice(0, 3).map((item) => {
        const menuItem =
            item.menuItem?.imageUrl ? item.menuItem : lookup[item.menuItemId] ?? item.menuItem;
        return resolveImageUrl(menuItem?.imageUrl);
    });
    const overflow = Math.max(0, order.items.length - 3);

    return (
        <button
            onClick={onClick}
            className={`text-left rounded-2xl border bg-#f3e7d2 hover:border-red-500/50 transition-all shadow-lg p-4 flex flex-col gap-3 ${tone.border}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">#{order.id.slice(-4)}</span>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${tone.badge}`}>
                        {order.status}
                    </span>
                </div>
                <div className="text-xs text-gray-400 text-right">
                    <div>{format(new Date(order.createdAt), 'HH:mm')}</div>
                    <div className="text-[11px] text-gray-500">{order.orderType === OrderType.TAKEAWAY ? 'Takeaway' : 'Dine-in'}</div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="text-4xl font-black text-white tracking-tight">
                    {order.tokenNumber ?? (order.orderType === OrderType.TAKEAWAY ? '—' : 'N/A')}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <div className="flex -space-x-2">
                        {thumbnails.map((src, idx) => (
                            <ImageThumb key={idx} src={src} size="sm" />
                        ))}
                        {overflow > 0 && (
                            <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-300">
                                +{overflow}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-300">
                <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
                <span className="text-white font-semibold">Rs. {order.totalAmount.toFixed(2)}</span>
            </div>
        </button>
    );
}

function ImageThumb({ src, label, size = 'md' }: { src?: string; label?: string; size?: 'md' | 'sm' }) {
    const dimension = size === 'sm' ? 'w-8 h-8' : 'w-14 h-14';
    if (!src) {
        return (
            <div className={`${dimension} rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-xs text-gray-500 uppercase`}>{label?.[0] || '?'}</div>
        );
    }
    return (
        <div className={`${dimension} rounded-xl overflow-hidden border border-gray-800 bg-gray-800 relative`}>
            <Image
                src={src}
                alt={label || 'item'}
                fill
                sizes="64px"
                className="object-cover"
                priority={false}
                unoptimized
            />
        </div>
    );
}

function MobileFooterBar({
    hasCart,
    totalAmount,
    submitting,
    onSubmit,
    onViewOrders,
}: {
    hasCart: boolean;
    totalAmount: number;
    submitting: boolean;
    onSubmit: () => void;
    onViewOrders: () => void;
}) {
    if (!hasCart) return null;
    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 backdrop-blur-md border-t border-gray-800 px-4 py-3">
            <div className="flex items-center gap-3">
                <div className="flex-1 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                    <p className="text-sm text-gray-400">Cart total</p>
                    <p className="text-xl font-bold">Rs. {totalAmount.toFixed(2)}</p>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onViewOrders}
                    className="whitespace-nowrap"
                >
                    View Orders
                </Button>
                <Button
                    size="sm"
                    onClick={onSubmit}
                    isLoading={submitting}
                    className="whitespace-nowrap"
                >
                    Create
                </Button>
            </div>
        </div>
    );
}

function IconButton({ children, onClick, ariaLabel }: { children: React.ReactNode; onClick: () => void; ariaLabel: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10"
        >
            {children}
        </button>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
    );
}

function BellIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 01-6 0"
            />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
        </svg>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}

function MinusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 0H4" />
        </svg>
    );
}

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}

function formatCategoryLabel(value?: string) {
    if (!value) return 'Item';
    const trimmed = value.trim();
    if (!trimmed) return 'Item';
    const normalized = trimmed.replace(/_/g, ' ');
    const shouldTitleCase = trimmed === trimmed.toUpperCase() || trimmed.includes('_');
    if (!shouldTitleCase) return normalized;
    return normalized.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
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
