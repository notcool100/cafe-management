'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { orderService } from '@/lib/api/order-service';
import Spinner from '@/components/ui/Spinner';

export default function StaffDashboardPage() {
    const [stats, setStats] = useState({
        active: 0,
        completed: 0,
        totalToday: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const activeOrders = await orderService.getActiveOrders();
            setStats({
                active: activeOrders.length,
                completed: 0,
                totalToday: activeOrders.length,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.35em] text-[#9b7d6b]">Staff Dashboard</p>
                <h1 className="text-3xl md:text-4xl font-semibold text-[#5a3a2e]">Ready for service</h1>
                <p className="text-sm text-[#8b6f5f]">Track active orders and keep the floor moving smoothly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-3xl border border-[#e2d6c1] bg-[#f3e7d2] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#8b6f5f]">Active Orders</p>
                        <span className="h-10 w-10 rounded-2xl border border-[#e2d6c1] bg-[#fff6e6] flex items-center justify-center text-[#5a3a2e]">
                            <ClipboardListIcon className="h-5 w-5" />
                        </span>
                    </div>
                    <p className="text-4xl font-semibold mt-6 text-[#5a3a2e]">{stats.active}</p>
                </div>

                <div className="rounded-3xl border border-[#e2d6c1] bg-[#fff6e6] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#8b6f5f]">Completed Today</p>
                        <span className="h-10 w-10 rounded-2xl border border-[#e2d6c1] bg-[#f3e7d2] flex items-center justify-center text-[#5a3a2e]">
                            <CheckCircleIcon className="h-5 w-5" />
                        </span>
                    </div>
                    <p className="text-4xl font-semibold mt-6 text-[#5a3a2e]">
                        {stats.completed > 0 ? stats.completed : '--'}
                    </p>
                </div>

                <div className="rounded-3xl border border-[#e2d6c1] bg-[#fff6e6] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-[#8b6f5f]">Average Wait Time</p>
                        <span className="h-10 w-10 rounded-2xl border border-[#e2d6c1] bg-[#f3e7d2] flex items-center justify-center text-[#5a3a2e]">
                            <ClockIcon className="h-5 w-5" />
                        </span>
                    </div>
                    <p className="text-4xl font-semibold mt-6 text-[#5a3a2e]">-- min</p>
                </div>
            </div>

            <div className="rounded-3xl border border-[#e2d6c1] bg-[#fff6e6] p-6 md:p-8 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold text-[#5a3a2e]">Manage Active Orders</h2>
                        <p className="text-sm text-[#8b6f5f] mt-2">
                            View incoming tickets and keep order statuses updated in real time.
                        </p>
                    </div>
                    <Link
                        href="/staff/orders"
                        className="inline-flex items-center justify-center rounded-full bg-[#5a3a2e] px-6 py-3 text-sm font-semibold text-[#fffaf0] transition-colors hover:bg-[#6d4a3b]"
                    >
                        Go to Active Orders
                    </Link>
                </div>
            </div>
        </div>
    );
}

function ClipboardListIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
        </svg>
    );
}
