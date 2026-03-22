'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { orderService } from '@/lib/api/order-service';
import { OrderNotification, SharedItemNotification } from '@/lib/types';
import { useAuthStore } from '@/lib/store/auth-store';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const MAX_HISTORY_ITEMS = 50;

type ToastState = {
    message: string;
    type: 'success' | 'error' | 'info';
    isVisible: boolean;
};

const getNotificationKey = (notification: SharedItemNotification) =>
    `${notification.orderId}-${notification.completedAt}-${notification.orderBranchId}-${notification.itemNames.join('|')}`;

const getOrderNotificationKey = (notification: OrderNotification) =>
    `${notification.orderId}-${notification.createdAt}-${notification.status}`;

const mergeNotifications = (
    incoming: SharedItemNotification[],
    existing: SharedItemNotification[]
): SharedItemNotification[] => {
    const combined = [...incoming, ...existing];
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
        const key = getNotificationKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    return unique.slice(0, MAX_HISTORY_ITEMS);
};

const mergeOrderNotifications = (
    incoming: OrderNotification[],
    existing: OrderNotification[]
): OrderNotification[] => {
    const combined = [...incoming, ...existing];
    const seen = new Set<string>();
    const unique = combined.filter((item) => {
        const key = getOrderNotificationKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return unique.slice(0, MAX_HISTORY_ITEMS);
};

export default function StaffNotificationsPage() {
    const { user, selectedBranchId } = useAuthStore();
    const currentBranchId = selectedBranchId || '';

    const [notifications, setNotifications] = useState<SharedItemNotification[]>([]);
    const [orderNotifications, setOrderNotifications] = useState<OrderNotification[]>([]);
    const [sharedNotifySince, setSharedNotifySince] = useState<string | null>(null);
    const [orderNotifySince, setOrderNotifySince] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        message: '',
        type: 'info',
        isVisible: false,
    });

    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sharedNotifyKey = currentBranchId ? `shared-item-notify-since:${currentBranchId}` : 'shared-item-notify-since';
    const sharedNotifyHistoryKey = currentBranchId
        ? `shared-item-notify-history:${currentBranchId}`
        : 'shared-item-notify-history';
    const sharedNotifyLastSeenKey = currentBranchId
        ? `shared-item-notify-last-seen:${currentBranchId}`
        : 'shared-item-notify-last-seen';
    const orderNotifyKey = currentBranchId ? `order-notify-since:${currentBranchId}` : 'order-notify-since';
    const orderNotifyHistoryKey = currentBranchId
        ? `order-notify-history:${currentBranchId}`
        : 'order-notify-history';
    const orderNotifyLastSeenKey = currentBranchId
        ? `order-notify-last-seen:${currentBranchId}`
        : 'order-notify-last-seen';

    const hydrateFromStorage = useCallback(() => {
        if (typeof window === 'undefined') return;

        const storedHistory = window.localStorage.getItem(sharedNotifyHistoryKey);
        if (storedHistory) {
            try {
                const parsed = JSON.parse(storedHistory) as SharedItemNotification[];
                if (Array.isArray(parsed)) {
                    const merged = mergeNotifications(parsed, []);
                    setNotifications(merged);
                }
            } catch {
                // ignore corrupted history; fetching will repopulate
            }
        }

        const storedOrderHistory = window.localStorage.getItem(orderNotifyHistoryKey);
        if (storedOrderHistory) {
            try {
                const parsed = JSON.parse(storedOrderHistory) as OrderNotification[];
                if (Array.isArray(parsed)) {
                    const merged = mergeOrderNotifications(parsed, []);
                    setOrderNotifications(merged);
                }
            } catch {
                // ignore corrupted history; fetching will repopulate
            }
        }
    }, [sharedNotifyHistoryKey, orderNotifyHistoryKey]);

    const fetchNotifications = useCallback(
        async (showInitialLoader = false) => {
            if (!currentBranchId) {
                setIsLoading(false);
                return;
            }

            try {
                if (showInitialLoader) {
                    setIsLoading(true);
                } else {
                    setIsRefreshing(true);
                }

                const [incoming, incomingOrders] = await Promise.all([
                    orderService.getSharedItemNotifications(sharedNotifySince ?? undefined),
                    orderService.getOrderNotifications(orderNotifySince ?? undefined),
                ]);
                if (incoming.length === 0) {
                    if (!sharedNotifySince && typeof window !== 'undefined') {
                        const now = new Date().toISOString();
                        setSharedNotifySince(now);
                        window.localStorage.setItem(sharedNotifyKey, now);
                    }
                } else {
                    const latest = incoming.reduce((current, next) => {
                        const currentTime = new Date(current.completedAt).getTime();
                        const nextTime = new Date(next.completedAt).getTime();
                        return nextTime > currentTime ? next : current;
                    });

                    const nextSince = latest.completedAt;
                    setSharedNotifySince(nextSince);

                    if (typeof window !== 'undefined') {
                        window.localStorage.setItem(sharedNotifyKey, nextSince);
                        window.localStorage.setItem(sharedNotifyLastSeenKey, new Date().toISOString());
                    }

                    setNotifications((prev) => {
                        const merged = mergeNotifications(incoming, prev);
                        if (typeof window !== 'undefined') {
                            window.localStorage.setItem(sharedNotifyHistoryKey, JSON.stringify(merged));
                        }
                        return merged;
                    });
                }

                if (incomingOrders.length === 0) {
                    if (!orderNotifySince && typeof window !== 'undefined') {
                        const now = new Date().toISOString();
                        setOrderNotifySince(now);
                        window.localStorage.setItem(orderNotifyKey, now);
                    }
                } else {
                    const latestOrder = incomingOrders.reduce((current, next) => {
                        const currentTime = new Date(current.createdAt).getTime();
                        const nextTime = new Date(next.createdAt).getTime();
                        return nextTime > currentTime ? next : current;
                    });

                    const nextSinceOrders = latestOrder.createdAt;
                    setOrderNotifySince(nextSinceOrders);

                    if (typeof window !== 'undefined') {
                        window.localStorage.setItem(orderNotifyKey, nextSinceOrders);
                        window.localStorage.setItem(orderNotifyLastSeenKey, new Date().toISOString());
                    }

                    setOrderNotifications((prev) => {
                        const merged = mergeOrderNotifications(incomingOrders, prev);
                        if (typeof window !== 'undefined') {
                            window.localStorage.setItem(orderNotifyHistoryKey, JSON.stringify(merged));
                        }
                        return merged;
                    });
                }
            } catch {
                setToast({
                    message: 'Unable to load notifications right now.',
                    type: 'error',
                    isVisible: true,
                });
            } finally {
                if (showInitialLoader) {
                    setIsLoading(false);
                } else {
                    setIsRefreshing(false);
                }
            }
        },
        [
            sharedNotifyHistoryKey,
            sharedNotifyKey,
            sharedNotifyLastSeenKey,
            sharedNotifySince,
            orderNotifyHistoryKey,
            orderNotifyKey,
            orderNotifyLastSeenKey,
            orderNotifySince,
            currentBranchId,
        ]
    );

    const handleRefresh = useCallback(() => {
        void fetchNotifications(false);
    }, [fetchNotifications]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!currentBranchId) {
            setIsLoading(false);
            return;
        }

        const storedSince = window.localStorage.getItem(sharedNotifyKey);
        if (storedSince) {
            setSharedNotifySince(storedSince);
        }
        const storedOrderSince = window.localStorage.getItem(orderNotifyKey);
        if (storedOrderSince) {
            setOrderNotifySince(storedOrderSince);
        }

        window.localStorage.setItem(sharedNotifyLastSeenKey, new Date().toISOString());
        window.localStorage.setItem(orderNotifyLastSeenKey, new Date().toISOString());
        hydrateFromStorage();
    }, [
        hydrateFromStorage,
        sharedNotifyKey,
        sharedNotifyLastSeenKey,
        orderNotifyKey,
        orderNotifyLastSeenKey,
        currentBranchId,
    ]);

    useEffect(() => {
        if (!currentBranchId) return;

        void fetchNotifications(true);
        refreshIntervalRef.current = setInterval(() => {
            void fetchNotifications(false);
        }, 10000);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [fetchNotifications, currentBranchId]);

    return (
        <div className="space-y-6">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-bold text-black">Notifications</h1>
                    <p className="text-sm text-[#8b6f5f]">Order updates and shared item activity across branches.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-auto"
                    onClick={handleRefresh}
                    isLoading={isRefreshing}
                >
                    <RefreshIcon className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <Card variant="glass" className="shadow-xl border border-gray-800/60">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle>Order Notifications</CardTitle>
                    <span className="text-sm text-[#8a6c61]">{orderNotifications.length} total</span>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Spinner size="lg" />
                        </div>
                    ) : orderNotifications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e4d7c2] bg-[#fffaf0] p-6 text-sm text-[#8a6c61]">
                            No order activity yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orderNotifications.map((notification) => {
                                const createdAt = new Date(notification.createdAt);
                                const timeLabel = isNaN(createdAt.getTime()) ? '-' : format(createdAt, 'PP p');
                                const tokenLabel = notification.tokenNumber
                                    ? `#${notification.tokenNumber}`
                                    : `#${notification.orderId.slice(0, 6).toUpperCase()}`;
                                const itemsLabel = notification.itemNames.length
                                    ? notification.itemNames.join(', ')
                                    : 'Order items';
                                const statusLabel = notification.status?.toLowerCase().replace('_', ' ') ?? 'pending';

                                return (
                                    <div
                                        key={getOrderNotificationKey(notification)}
                                        className="rounded-xl border border-[#e4d7c2] bg-[#fffaf0] p-4"
                                    >
                                        <p className="text-sm font-semibold text-[#4e2f27]">Order {tokenLabel}</p>
                                        <p className="mt-1 text-xs text-[#7a6a5f]" title={itemsLabel}>
                                            {itemsLabel}
                                        </p>
                                        <p className="text-xs text-[#7a6a5f]">
                                            {statusLabel} • {notification.orderType?.toLowerCase().replace('_', ' ') ?? 'dine in'}
                                        </p>
                                        <p className="text-xs text-[#9a8577]">{timeLabel}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card variant="glass" className="shadow-xl border border-gray-800/60">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                    <CardTitle>Shared Item History</CardTitle>
                    <span className="text-sm text-[#8a6c61]">{notifications.length} total</span>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Spinner size="lg" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e4d7c2] bg-[#fffaf0] p-6 text-sm text-[#8a6c61]">
                            No shared item activity yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => {
                                const completedAt = new Date(notification.completedAt);
                                const timeLabel = isNaN(completedAt.getTime()) ? '-' : format(completedAt, 'PP p');
                                const branchLabel = notification.orderBranchName || 'another branch';
                                const itemsLabel = notification.itemNames.length
                                    ? notification.itemNames.join(', ')
                                    : 'Shared item';

                                return (
                                    <div
                                        key={getNotificationKey(notification)}
                                        className="rounded-xl border border-[#e4d7c2] bg-[#fffaf0] p-4"
                                    >
                                        <p className="text-sm font-semibold text-[#4e2f27]" title={itemsLabel}>
                                            {itemsLabel}
                                        </p>
                                        <p className="mt-1 text-xs text-[#7a6a5f]">Used at {branchLabel}</p>
                                        <p className="text-xs text-[#9a8577]">{timeLabel}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function RefreshIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
        </svg>
    );
}
