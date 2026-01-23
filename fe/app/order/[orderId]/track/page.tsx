'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { orderService } from '@/lib/api/order-service';
import { Order, OrderStatus } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function OrderTrackingPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrder();
        const interval = setInterval(loadOrder, 5000);
        return () => clearInterval(interval);
    }, [orderId]);

    const loadOrder = async () => {
        try {
            const data = await orderService.getOrder(orderId);
            setOrder(data);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load order:', error);
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!order) return null;

    const steps = [
        OrderStatus.PENDING,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED
    ];
    const currentStepIndex = steps.indexOf(order.status);

    return (
        <div className="min-h-screen bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Order Status</h1>
                    <p className="text-gray-400">Tracking Order #{order.tokenNumber || order.id.slice(0, 8)}</p>
                </div>

                {/* Status Timeline */}
                <div className="relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-800 rounded-full -z-10"></div>
                    <div className="flex justify-between">
                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step} className="flex flex-col items-center bg-gray-950 px-2">
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors duration-300
                                        ${isCompleted ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400'}
                                        ${isCurrent ? 'ring-4 ring-green-500/30' : ''}
                                    `}>
                                        {isCompleted ? (
                                            <CheckIcon className="h-5 w-5" />
                                        ) : (
                                            <span className="text-xs">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium ${isCompleted ? 'text-green-400' : 'text-gray-500'}`}>
                                        {step}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Order Details Card */}
                <Card variant="glass">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-800">
                            <div>
                                <p className="text-sm text-gray-400">Display Token</p>
                                <p className="text-3xl font-bold text-white">{order.tokenNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Total Amount</p>
                                <p className="text-2xl font-bold text-purple-400">${order.totalAmount.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-medium text-white">Items</h3>
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="text-gray-300">
                                        <span className="text-gray-500 mr-2">{item.quantity}x</span>
                                        {item.menuItem?.name}
                                    </span>
                                    <span className="text-gray-400">${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link href={`/menu/${order.branchId}`}>
                        <Button variant="outline">Place Another Order</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
    );
}
