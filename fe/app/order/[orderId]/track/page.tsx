'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { orderService } from '@/lib/api/order-service';
import { Order, OrderStatus, OrderType } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { formatOrderItemName, isToppingOrderItem } from '@/lib/utils/order-items';

export default function OrderTrackingPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchOrder = async () => {
            try {
                const data = await orderService.getOrder(orderId);
                if (!active) return;
                setOrder(data);
                setIsLoading(false);
            } catch (error) {
                if (!active) return;
                console.error('Failed to load order:', error);
                setIsLoading(false);
            }
        };

        void fetchOrder();
        const interval = setInterval(fetchOrder, 5000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [orderId]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6fbfa' }}>
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
    const displayToken = order.tokenNumber ?? order.id.slice(0, 8);

    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ background: '#f6fbfa' }}>
            <div className="max-w-xl mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Status</h1>
                    <p className="text-gray-600 font-medium">
                        {order.orderType === OrderType.TAKEAWAY ? 'Takeaway order' : 'Tracking Order'} #{order.tokenNumber || order.id.slice(0, 8)}
                    </p>
                </div>

                {/* Status Timeline */}
                <div className="relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full -z-10"></div>
                    <div className="flex justify-between">
                        {steps.map((step, index) => {
                            const isCompleted = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step} className="flex flex-col items-center px-2" style={{ background: '#f6fbfa' }}>
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-colors duration-300
                                        ${isCompleted ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}
                                        ${isCurrent ? 'ring-4 ring-green-500/20' : ''}
                                    `}>
                                        {isCompleted ? (
                                            <CheckIcon className="h-5 w-5" />
                                        ) : (
                                            <span className="text-xs">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-bold ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                                        {step}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Order Details Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-50">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Display Token</p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {order.orderType === OrderType.TAKEAWAY ? 'Not required' : displayToken}
                                </p>
                                {order.orderType === OrderType.TAKEAWAY && (
                                    <p className="text-xs text-gray-500 mt-1">Takeaway orders don&apos;t use tokens.</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                                <p className="text-2xl font-bold text-purple-600">Rs. {order.totalAmount.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-900">Items</h3>
                            {order.items.map((item) => (
                                <div key={item.id} className="flex justify-between text-sm">
                                    <span className="flex items-center gap-2 text-gray-800 font-medium">
                                        <span className="text-gray-400 mr-2">{item.quantity}x</span>
                                        <span>{formatOrderItemName(item, { prefixTopping: true })}</span>
                                        {isToppingOrderItem(item) && (
                                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                                                Topping
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-gray-600 font-semibold">Rs. {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <Link href={`/menu/${order.branchId}`}>
                        <Button className="bg-purple-600 hover:bg-purple-700 shadow-md">Place Another Order</Button>
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
