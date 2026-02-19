'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { format, startOfDay, startOfWeek, subHours } from 'date-fns';
import { orderService } from '@/lib/api/order-service';
import { menuService } from '@/lib/api/menu-service';
import { Order, OrderStatus, MenuItem, OrderType, MenuCategory } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import OrderDetailModal from '@/components/staff/OrderDetailModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { useAuthStore } from '@/lib/store/auth-store';
import { resolveImageUrl } from '@/lib/utils/image';

const categoryLabel: Record<MenuCategory, string> = {
    [MenuCategory.FOOD]: 'Food',
    [MenuCategory.BEVERAGE]: 'Beverage',
    [MenuCategory.DESSERT]: 'Dessert',
    [MenuCategory.APPETIZER]: 'Appetizer',
    [MenuCategory.MAIN_COURSE]: 'Main Course',
    [MenuCategory.SNACK]: 'Snack',
};

type CartLine = {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    category?: MenuCategory;
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

const compactStatusTone: Record<OrderStatus, string> = {
    [OrderStatus.PENDING]: 'border-[#f2d39f] bg-[#fff2dc] text-[#8b5a15]',
    [OrderStatus.PREPARING]: 'border-[#a4c8ff] bg-[#e9f2ff] text-[#295b9a]',
    [OrderStatus.READY]: 'border-[#a8d9a8] bg-[#e8f8e8] text-[#246229]',
    [OrderStatus.COMPLETED]: 'border-[#c6c6c6] bg-[#efefef] text-[#4f4f4f]',
    [OrderStatus.CANCELLED]: 'border-[#e0b0b0] bg-[#fbe8e8] text-[#8a3535]',
    [OrderStatus.CANCELLATION_PENDING]: 'border-[#f0c89f] bg-[#fff0de] text-[#8c5a1d]',
};

export default function ActiveOrdersPage() {
    const { user } = useAuthStore();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [menuLoading, setMenuLoading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL');
    const [dateFilter, setDateFilter] = useState<DateFilter>('TODAY');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<MenuCategory | 'ALL'>('ALL');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });
    const [cartItems, setCartItems] = useState<CartLine[]>([]);
    const [isCompact, setIsCompact] = useState(false); // tablets & mobile toggle view
    const [activeSection, setActiveSection] = useState<'BUILD' | 'ORDERS'>('BUILD');

    const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    const categories = ['ALL', ...Object.values(MenuCategory)] as Array<MenuCategory | 'ALL'>;
    const branchName = user?.branch?.name || 'Cafe Branch';
    const branchLocation = user?.branch?.location || 'Location unavailable';
    const branchImageUrl = useMemo(() => {
        for (const item of menuItems) {
            const image = resolveImageUrl(item.imageUrl);
            if (image) return image;
        }
        return undefined;
    }, [menuItems]);
    const formatPrice = (amount: number) => (
        Number.isInteger(amount) ? amount.toString() : amount.toFixed(2)
    );

    return (
        <div className={`space-y-6 ${isCompact && hasCart ? 'pb-24' : ''}`} style={staffOrdersTextTheme}>
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            {!isCompact && (
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-white">Staff Orders</h1>
                    <p className="text-gray-400">PathoFood-like simple flow for quick walk-in orders.</p>
                </div>
            )}

            {isCompact && (
                <section className="rounded-[28px] border border-[#d8d3cb] bg-[#f6f4ef] p-3 shadow-[0_20px_45px_rgba(76,56,31,0.08)]">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                if (activeSection === 'ORDERS') {
                                    setActiveSection('BUILD');
                                    return;
                                }
                                if (window.history.length > 1) {
                                    window.history.back();
                                }
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#4a4540] hover:bg-[#e9e5de]"
                            aria-label="Back"
                        >
                            <ArrowLeftIcon className="h-5 w-5" />
                        </button>
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f7870]" />
                            <input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-10 w-full rounded-full border border-[#d6d2ca] bg-[#f0eee7] pl-9 pr-4 text-sm text-[#1f1f1f] placeholder:text-[#8d8780] outline-none focus:border-[#bbb4aa]"
                                placeholder="Search Dishes"
                            />
                        </div>
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#4a4540] hover:bg-[#e9e5de]"
                            aria-label="Share"
                        >
                            <ShareIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#4a4540] hover:bg-[#e9e5de]"
                            aria-label="Favorite"
                        >
                            <HeartOutlineIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#d7d1ca] bg-[#f9f8f4] p-3">
                        <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-[#d5d0c8]">
                                {branchImageUrl ? (
                                    <Image
                                        src={branchImageUrl}
                                        alt={branchName}
                                        fill
                                        sizes="64px"
                                        className="object-cover"
                                        priority={false}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[#847b72]">
                                        <StoreIcon className="h-6 w-6" />
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-2xl font-semibold leading-7 text-[#1f1f1f]">{branchName}</p>
                                <p className="mt-1 truncate text-sm text-[#7d766e]">{branchLocation}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-[#ccb89f] bg-[#e8decf] px-4 py-2 text-left text-sm font-medium text-[#4c4035]"
                    >
                        <PromoIcon className="h-4 w-4 text-[#d1832c]" />
                        Promocodes
                    </button>

                    <div className="mt-3 -mx-1 overflow-x-auto px-1 hide-scrollbar">
                        <div className="flex w-max gap-2 pb-1">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${categoryFilter === cat
                                        ? 'border-[#3c3833] bg-[#3c3833] text-[#fffaf3]'
                                        : 'border-[#d7d2ca] bg-[#f8f6f2] text-[#69645e]'
                                        }`}
                                >
                                    {cat === 'ALL' ? 'All' : categoryLabel[cat]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                        <h2 className="text-4xl font-semibold leading-none tracking-tight text-[#151515]">Menu</h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveSection('BUILD')}
                                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activeSection === 'BUILD'
                                    ? 'bg-[#111111] text-white'
                                    : 'border border-[#d7d2ca] bg-[#f8f6f2] text-[#55504a]'
                                    }`}
                            >
                                New Order
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('ORDERS')}
                                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activeSection === 'ORDERS'
                                    ? 'bg-[#111111] text-white'
                                    : 'border border-[#d7d2ca] bg-[#f8f6f2] text-[#55504a]'
                                    }`}
                            >
                                Live Orders
                            </button>
                        </div>
                    </div>
                </section>
            )}

            <div className={`${isCompact ? '' : 'grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-4'}`}>
                {(!isCompact || activeSection === 'BUILD') && (
                    <Card
                        id="build-section"
                        variant={isCompact ? 'default' : 'glass'}
                        className={isCompact
                            ? 'border border-[#d9d4cd] bg-white p-0 shadow-none'
                            : 'shadow-xl border border-gray-800/60'}
                    >
                        {!isCompact && (
                            <CardHeader className="flex flex-col gap-1">
                                <CardTitle>Build Order</CardTitle>
                                <p className="text-sm text-gray-500">Tap an item to add, keep the cart on the right in view.</p>
                            </CardHeader>
                        )}
                        <CardContent className={isCompact ? 'space-y-3 p-0' : 'space-y-4'}>
                            {!isCompact && (
                                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                            <input
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full rounded-xl border border-gray-800 bg-gray-900/60 pl-9 pr-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 outline-none"
                                                placeholder="Search menu or notes"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((cat) => (
                                            <FilterChip
                                                key={cat}
                                                active={categoryFilter === cat}
                                                label={cat === 'ALL' ? 'All' : categoryLabel[cat]}
                                                onClick={() => setCategoryFilter(cat)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {isCompact && (
                                <div className="rounded-2xl border border-[#dbd6ce] bg-white px-3 py-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs uppercase tracking-[0.16em] text-[#7f7870]">Current cart</p>
                                        <p className="text-lg font-semibold text-[#232120]">Rs. {formatPrice(totalAmount)}</p>
                                    </div>
                                    <p className="mt-1 text-sm text-[#6f6861]">
                                        {totalItems} item{totalItems === 1 ? '' : 's'} | {orderType === OrderType.TAKEAWAY ? 'Takeaway' : 'Dine-in'}
                                    </p>
                                    <div className="mt-2 flex gap-2">
                                        {[OrderType.DINE_IN, OrderType.TAKEAWAY].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setOrderType(type)}
                                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${orderType === type
                                                    ? 'border-[#3c3833] bg-[#3c3833] text-[#fffaf3]'
                                                    : 'border-[#d7d2ca] bg-[#faf8f4] text-[#5e5953]'
                                                    }`}
                                            >
                                                {type === OrderType.DINE_IN ? 'Dine-in' : 'Takeaway'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {menuLoading ? (
                                <div className="flex justify-center py-16">
                                    <Spinner size="lg" />
                                </div>
                            ) : filteredMenuItems.length === 0 ? (
                                <div className={isCompact
                                    ? 'rounded-2xl border border-dashed border-[#d5d1ca] bg-white px-4 py-10 text-center'
                                    : 'text-center py-12 border border-dashed border-gray-800 rounded-2xl bg-gray-900/40'}>
                                    <p className={isCompact ? 'text-[#59534d]' : 'text-gray-400'}>No menu items match your filters.</p>
                                    {!isCompact && (
                                        <p className="text-gray-500 text-sm">Clear search or switch category.</p>
                                    )}
                                </div>
                            ) : (
                                <div className={isCompact ? 'overflow-hidden rounded-2xl border border-[#d9d4cd] bg-white' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'}>
                                    {filteredMenuItems.map((item) => {
                                        const existing = cartItems.find((c) => c.menuItemId === item.id);
                                        const imageUrl = resolveImageUrl(item.imageUrl);
                                        if (isCompact) {
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start gap-3 border-b border-[#ebe6de] px-3 py-3 last:border-b-0"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h3 className="truncate text-3xl font-medium leading-[1.05] text-[#1b1b1b]">
                                                                {item.name}
                                                            </h3>
                                                            {!item.available && (
                                                                <span className="rounded-full border border-[#d9bbb6] bg-[#f8e3e0] px-2 py-0.5 text-[11px] font-semibold text-[#9b3f36]">
                                                                    Sold Out
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.description && (
                                                            <p className="mt-1 line-clamp-2 text-xs text-[#7a756e]">{item.description}</p>
                                                        )}
                                                        <p className="mt-2 text-2xl font-medium text-[#292623]">
                                                            Rs. {formatPrice(item.price)}
                                                        </p>
                                                    </div>
                                                    <div className="w-20 shrink-0">
                                                        <div className="mx-auto h-14 w-14 overflow-hidden rounded-full bg-[#d8d8d8]">
                                                            {imageUrl ? (
                                                                <Image
                                                                    src={imageUrl}
                                                                    alt={item.name}
                                                                    width={56}
                                                                    height={56}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : null}
                                                        </div>
                                                        <div className="mt-2 flex justify-center">
                                                            {existing ? (
                                                                <div className="inline-flex items-center gap-1 rounded-full border border-[#7cac80] bg-[#f2fbf2] px-1 py-0.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleUpdateQuantity(item.id, existing.quantity - 1)}
                                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#2f7f37] hover:bg-[#e2f2e2]"
                                                                        aria-label="Decrease quantity"
                                                                    >
                                                                        <MinusIcon className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <span className="min-w-[1.2rem] text-center text-sm font-semibold text-[#24592a]">
                                                                        {existing.quantity}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddItem(item, 1)}
                                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#2f7f37] hover:bg-[#e2f2e2]"
                                                                        aria-label="Increase quantity"
                                                                    >
                                                                        <PlusIcon className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddItem(item)}
                                                                    disabled={!item.available}
                                                                    className="rounded-full border border-[#6aa06f] bg-[#f8fff8] px-3 py-0.5 text-sm font-medium text-[#2f7f37] disabled:cursor-not-allowed disabled:border-[#cfcac2] disabled:bg-[#f5f2ec] disabled:text-[#9e978f]"
                                                                >
                                                                    Add
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={item.id}
                                                className="group rounded-2xl border border-gray-800 bg-gray-900/50 overflow-hidden flex flex-col shadow-sm hover:border-purple-500/50 transition-all"
                                            >
                                                <div className="aspect-[4/3] relative bg-gray-800">
                                                    {imageUrl ? (
                                                        <Image
                                                            src={imageUrl}
                                                            alt={item.name}
                                                            fill
                                                            sizes="(max-width: 1280px) 50vw, 33vw"
                                                            className="object-cover"
                                                            priority={false}
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
                                                            {categoryLabel[item.category]}
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
                                                        <span className="text-sm text-gray-400">Tap to add to order</span>
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

                {!isCompact && (
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
                                    label="Customer name (optional)"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Walk-in guest"
                                />
                                <Input
                                    label="Customer phone (optional)"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="For pickup updates"
                                />
                            </div>

                            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 divide-y divide-gray-800 max-h-[360px] overflow-y-auto">
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
                                                <p className="text-xs text-gray-400">{item.category ? categoryLabel[item.category] : 'Item'} | Rs. {item.price.toFixed(2)}</p>
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
                                                className="text-gray-500 hover:text-red-400 transition"
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
                                    {totalItems} item{totalItems === 1 ? '' : 's'} | {orderType === OrderType.TAKEAWAY ? 'No token needed' : 'Token will be generated'}
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
                <div className={isCompact ? 'space-y-3' : 'space-y-4'} id="orders-section">
                    {!isCompact && (
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
                    )}

                    {isCompact && (
                        <>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('ALL')}
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${filterStatus === 'ALL'
                                        ? 'border-[#111111] bg-[#111111] text-white'
                                        : 'border-[#d7d2ca] bg-[#faf8f4] text-[#5e5953]'
                                        }`}
                                >
                                    All
                                </button>
                                {[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.CANCELLATION_PENDING, OrderStatus.COMPLETED, OrderStatus.CANCELLED].map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setFilterStatus(status)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${filterStatus === status
                                            ? 'border-[#111111] bg-[#111111] text-white'
                                            : 'border-[#d7d2ca] bg-[#faf8f4] text-[#5e5953]'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => loadOrders(true)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d7d2ca] bg-[#faf8f4] text-[#59534d]"
                                    aria-label="Refresh"
                                >
                                    <RefreshIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                                {DATE_FILTERS.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setDateFilter(key)}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${dateFilter === key
                                            ? 'border-[#111111] bg-[#111111] text-white'
                                            : 'border-[#d7d2ca] bg-[#faf8f4] text-[#5e5953]'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {isLoading ? (
                        <div className={isCompact ? 'flex items-center justify-center py-14' : 'flex items-center justify-center h-64'}>
                            <Spinner size="lg" />
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className={isCompact
                            ? 'rounded-2xl border border-dashed border-[#d6d1ca] bg-white px-4 py-10 text-center'
                            : 'text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed'}>
                            <p className={isCompact ? 'text-[#59534d]' : 'text-gray-400 text-lg mb-2'}>No orders in this view</p>
                            {!isCompact && (
                                <p className="text-gray-600 text-sm">New orders will appear here automatically.</p>
                            )}
                        </div>
                    ) : (
                        <div className={isCompact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4'}>
                            {filteredOrders.map((order) => {
                                if (!isCompact) {
                                    return (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            onClick={() => setSelectedOrder(order.id)}
                                            lookup={menuLookup}
                                        />
                                    );
                                }

                                const itemCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
                                const token = order.tokenNumber ?? (order.orderType === OrderType.TAKEAWAY ? '--' : 'N/A');
                                return (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => setSelectedOrder(order.id)}
                                        className="w-full rounded-2xl border border-[#dbd6ce] bg-white px-3 py-2 text-left"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-[#726a63]">#{order.id.slice(-4)}</span>
                                                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${compactStatusTone[order.status]}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <span className="text-xs text-[#7c756d]">{format(new Date(order.createdAt), 'HH:mm')}</span>
                                        </div>
                                        <div className="mt-2 flex items-end justify-between gap-3">
                                            <div>
                                                <p className="text-lg font-semibold text-[#1f1f1f]">Token {token}</p>
                                                <p className="text-xs text-[#716a63]">
                                                    {itemCount} item{itemCount === 1 ? '' : 's'} | {order.orderType === OrderType.TAKEAWAY ? 'Takeaway' : 'Dine-in'}
                                                </p>
                                            </div>
                                            <p className="text-lg font-semibold text-[#1f1f1f]">Rs. {formatPrice(order.totalAmount)}</p>
                                        </div>
                                    </button>
                                );
                            })}
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
        const menuItem = item.menuItem ?? lookup[item.menuItemId];
        return resolveImageUrl(menuItem?.imageUrl);
    });
    const overflow = Math.max(0, order.items.length - 3);

    return (
        <button
            onClick={onClick}
            className={`text-left rounded-2xl border bg-gray-900/60 hover:border-purple-500/50 transition-all shadow-sm p-4 flex flex-col gap-3 ${tone.border}`}
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
                    {order.tokenNumber ?? (order.orderType === OrderType.TAKEAWAY ? '--' : 'N/A')}
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
        <div className="lg:hidden fixed bottom-3 left-0 right-0 z-40 px-4">
            <div className="mx-auto flex max-w-md items-center gap-2">
                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={submitting}
                    className="flex-1 rounded-full bg-[#eb7f78] px-3 py-2 text-sm font-medium text-[#2f1714] shadow-[0_10px_25px_rgba(165,84,77,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? 'Creating...' : `Checkout - Rs. ${totalAmount.toFixed(2)}`}
                </button>
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

function ArrowLeftIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    );
}

function ShareIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.59 13.51L15.42 17.5M15.41 6.5l-6.82 3.99M19 21a3 3 0 100-6 3 3 0 000 6zM5 15a3 3 0 100-6 3 3 0 000 6zm14-6a3 3 0 100-6 3 3 0 000 6z"
            />
        </svg>
    );
}

function HeartOutlineIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
            />
        </svg>
    );
}

function StoreIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10l1.5-5h15L21 10M4 10h16v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9zm6 4h4"
            />
        </svg>
    );
}

function PromoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 14l6-6m-4 0h4v4M6 6h8a2 2 0 012 2v8a2 2 0 01-2 2H6l-3-6 3-6z"
            />
        </svg>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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

