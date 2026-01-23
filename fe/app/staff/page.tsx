'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { orderService } from '@/lib/api/order-service';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
            // In a real app we might have a dedicated stats endpoint
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
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Staff Dashboard</h1>
                <p className="text-gray-400">Welcome back, get ready for service!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card variant="glass" hover>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Active Orders</p>
                                <p className="text-3xl font-bold text-green-400">
                                    {stats.active}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <ClipboardListIcon className="h-6 w-6 text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass" hover>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Completed Today</p>
                                <p className="text-3xl font-bold text-blue-400">
                                    --
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <CheckCircleIcon className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass" hover>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Average Wait Time</p>
                                <p className="text-3xl font-bold text-purple-400">
                                    -- min
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <ClockIcon className="h-6 w-6 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-bold text-white mb-2">Manage Orders</h2>
                    <p className="text-gray-300">View and update status of active customer orders.</p>
                </div>
                <Link href="/staff/orders">
                    <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white min-w-[200px]">
                        Go to Active Orders
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function ClipboardListIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    );
}

function CheckCircleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
