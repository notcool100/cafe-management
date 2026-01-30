'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart-store';
import { orderService } from '@/lib/api/order-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { getOrCreateDeviceId } from '@/lib/utils/device';
import { OrderType } from '@/lib/types';

export default function CheckoutPage() {
    const router = useRouter();
    const { items, getTotal, branchId, clearCart } = useCartStore();
    const [isLoading, setIsLoading] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
    const [hasCompletedOrder, setHasCompletedOrder] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    useEffect(() => {
        if (items.length === 0 && !hasCompletedOrder) {
            router.push('/');
        }
    }, [items, router, hasCompletedOrder]);

    const handlePlaceOrder = async () => {
        if (!branchId || items.length === 0) return;

        try {
            setIsLoading(true);
            const order = await orderService.createOrder({
                branchId,
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                deviceId: getOrCreateDeviceId(),
                orderType,
                items: items.map(item => ({
                    menuItemId: item.menuItem.id,
                    quantity: item.quantity,
                })),
            });

            setHasCompletedOrder(true);
            clearCart();
            if (orderType === OrderType.TAKEAWAY) {
                router.push(`/order/${order.id}/track`);
            } else {
                router.push(`/order/${order.id}/token`);
            }
        } catch (error: unknown) {
            console.error('Failed to place order:', error);
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to place order. Please try again.',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (items.length === 0) return null;

    return (
        <div className="min-h-screen bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Order Summary */}
                    <div className="space-y-6">
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Your Order</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {items.map((item) => (
                                    <div key={item.menuItem.id} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-white">{item.menuItem.name}</h4>
                                            <p className="text-sm text-gray-400">Rs. {item.menuItem.price.toFixed(2)} x {item.quantity}</p>
                                        </div>
                                        <p className="font-bold text-white">Rs. {(item.menuItem.price * item.quantity).toFixed(2)}</p>
                                    </div>
                                ))}
                                <div className="pt-4 flex justify-between items-center text-xl font-bold text-white border-t border-gray-800">
                                    <span>Total</span>
                                    <span>Rs. {getTotal().toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Customer Info & Actions */}
                    <div className="space-y-6">
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Customer Details (Optional)</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Order type</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[OrderType.DINE_IN, OrderType.TAKEAWAY].map((type) => (
                                            <Button
                                                key={type}
                                                variant={orderType === type ? 'primary' : 'outline'}
                                                onClick={() => setOrderType(type)}
                                                fullWidth
                                            >
                                                {type === OrderType.DINE_IN ? 'Dine-in' : 'Takeaway'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <Input
                                    label="Name"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter your name"
                                />
                                <Input
                                    label="Phone Number"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="Enter your phone number"
                                />
                            </CardContent>
                        </Card>

                        <Button
                            onClick={handlePlaceOrder}
                            isLoading={isLoading}
                            fullWidth
                            size="lg"
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/30"
                        >
                            Place Order
                        </Button>

                        <Link href={`/menu/${branchId}`} className="block">
                            <Button variant="ghost" fullWidth>
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
