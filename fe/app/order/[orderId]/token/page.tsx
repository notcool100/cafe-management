'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { orderService } from '@/lib/api/order-service';
import { Order, OrderType } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';

export default function TokenPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadOrder();
        // Short poll to update status if needed, but primarily just display token
        const interval = setInterval(loadOrder, 5000);
        return () => clearInterval(interval);
    }, [orderId]);

    useEffect(() => {
        if (order && order.orderType === OrderType.TAKEAWAY) {
            router.replace(`/order/${orderId}/track`);
        }
    }, [order, orderId, router]);

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

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 overflow-hidden">
            <style jsx>{`
                @keyframes token-pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                }

                @keyframes gradient-rotate {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                }

                @keyframes scale-in {
                    0% {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    100% {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                @keyframes shimmer {
                    0% {
                        background-position: -1000px 0;
                    }
                    100% {
                        background-position: 1000px 0;
                    }
                }

                .token-container {
                    animation: scale-in 0.5s ease-out;
                }

                .token-pulse {
                    animation: token-pulse 2s ease-in-out infinite;
                }

                .gradient-border {
                    background: linear-gradient(90deg, #8b5cf6, #ec4899, #ef4444, #ec4899, #8b5cf6);
                    background-size: 300% 300%;
                    animation: gradient-rotate 3s ease infinite;
                }

                .token-number {
                    animation: float 3s ease-in-out infinite;
                }

                .success-badge {
                    animation: scale-in 0.6s ease-out 0.3s both;
                }

                .action-buttons {
                    animation: scale-in 0.7s ease-out 0.5s both;
                }
            `}</style>

            <div className="max-w-md w-full space-y-8 text-center token-container">
                <div>
                    <h2 className="text-gray-400 text-lg uppercase tracking-wider mb-4 animate-pulse">Your Order Token</h2>
                    <div className="gradient-border p-1 rounded-3xl shadow-2xl token-pulse">
                        <div className="bg-gray-900 rounded-[22px] py-16 px-8 relative overflow-hidden">
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                                style={{
                                    animation: 'shimmer 3s infinite',
                                    backgroundSize: '1000px 100%'
                                }}>
                            </div>

                            <span className="token-number relative text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-purple-200 to-pink-200">
                                {order.tokenNumber}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 success-badge">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500 mb-2">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white">Order Placed Successfully!</h3>
                    <p className="text-gray-400">
                        Please wait for your number to be called. You can track your order status live.
                    </p>
                </div>

                <div className="flex flex-col gap-4 action-buttons">
                    <Link href={`/order/${orderId}/track`}>
                        <Button fullWidth size="lg" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30">
                            Track Order Status
                        </Button>
                    </Link>
                    <Link href={`/menu/${order.branchId}`}>
                        <Button variant="ghost" fullWidth>
                            Back to Menu
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
