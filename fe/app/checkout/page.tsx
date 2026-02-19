'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart-store';
import { orderService } from '@/lib/api/order-service';
import Toast from '@/components/ui/Toast';
import { getOrCreateDeviceId } from '@/lib/utils/device';
import { OrderType } from '@/lib/types';

const TAX_RATE = 0.1;

export default function CheckoutPage() {
    const router = useRouter();
    const { items, branchId, clearCart, updateQuantity } = useCartStore();
    const [isLoading, setIsLoading] = useState(false);
    const [hasCompletedOrder, setHasCompletedOrder] = useState(false);
    const [orderType, setOrderType] = useState<OrderType>(OrderType.DINE_IN);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });
    const subtotal = useMemo(
        () => items.reduce((total, item) => total + item.menuItem.price * item.quantity, 0),
        [items]
    );
    const taxAmount = useMemo(() => Number((subtotal * TAX_RATE).toFixed(2)), [subtotal]);
    const totalAmount = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

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
        <div className="min-h-screen bg-[#eceef0]">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-40 pt-4">
                <header className="mb-5 flex items-center justify-between px-1">
                    <Link
                        href={branchId ? `/menu/${branchId}` : '/'}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1f2937] transition-colors hover:bg-[#dfe3e7]"
                        aria-label="Back to menu"
                    >
                        <BackIcon className="h-6 w-6" />
                    </Link>
                    <h1 className="text-2xl font-medium text-[#111827]">Confirm Order</h1>
                    <div className="h-10 w-10" />
                </header>

                <section className="rounded-2xl border border-[#c5cbd3] bg-[#f8f9fb] p-3 shadow-[0_2px_14px_rgba(15,23,42,0.06)]">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-[1.65rem] font-medium text-[#0f172a]">Receipt</p>
                        <p className="text-[1.2rem] text-[#111827]">
                            {orderType === OrderType.DINE_IN ? 'Kot no: 0000' : 'Takeaway'}
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-[#d3d7dd] bg-[#fbfcfd]">
                        <div className="border-b border-[#d3d7dd] px-3 py-2">
                            <p className="text-[1.65rem] font-medium text-[#111827]">Cart</p>
                        </div>

                        {items.map((item) => (
                            <div
                                key={item.menuItem.id}
                                className="flex items-center justify-between border-b border-[#d3d7dd] px-3 py-2 last:border-b-0"
                            >
                                <div>
                                    <p className="text-[1.2rem] text-[#4b5563]">{item.menuItem.name}</p>
                                    <p className="text-[1.2rem] text-[#6b7280]">
                                        {formatCurrency(item.menuItem.price * item.quantity)}
                                    </p>
                                </div>

                                <div className="inline-flex items-center rounded-full border border-[#a7c8a3] bg-[#f7faf7]">
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                                        className="px-3 py-1 text-[1.2rem] text-[#1f2937] transition-colors hover:bg-[#e7eee7]"
                                        aria-label={`Decrease ${item.menuItem.name} quantity`}
                                    >
                                        -
                                    </button>
                                    <span className="min-w-6 text-center text-[1.2rem] text-[#111827]">{item.quantity}</span>
                                    <button
                                        type="button"
                                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                                        className="px-3 py-1 text-[1.2rem] text-[#1f2937] transition-colors hover:bg-[#e7eee7]"
                                        aria-label={`Increase ${item.menuItem.name} quantity`}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 space-y-2 border-t border-[#b7bdc6] pt-3">
                        <Row label="Subtotal" value={formatCurrency(subtotal)} />
                        <Row label="Tax" value={formatCurrency(taxAmount)} />
                        <div className="mt-2 flex items-center justify-between border-t border-[#7f8791] pt-2">
                            <span className="text-[2rem] text-[#111827]">Total Bill</span>
                            <span className="text-[2rem] font-medium text-[#111827]">{formatCurrency(totalAmount)}</span>
                        </div>
                    </div>
                </section>

                <section className="mt-4 rounded-2xl border border-[#9fb7d1] bg-[#f8f9fb] p-3 shadow-[0_2px_12px_rgba(15,23,42,0.05)]">
                    <h2 className="mb-2 text-[1.8rem] font-medium text-[#111827]">Payment</h2>
                    <div className="flex items-center justify-between rounded-xl border border-[#d3d7dd] bg-[#fbfcfd] px-3 py-2">
                        <div className="flex items-center gap-2">
                            <CashIcon className="h-6 w-6 text-[#6bb980]" />
                            <span className="text-[1.2rem] text-[#1f2937]">Pay via</span>
                        </div>

                        <div className="relative">
                            <select
                                value={paymentMethod}
                                onChange={(event) => setPaymentMethod(event.target.value)}
                                className="appearance-none bg-transparent pr-6 text-[1.2rem] text-[#111827] outline-none"
                                aria-label="Payment method"
                            >
                                <option value="CASH">Cash Payment</option>
                            </select>
                            <ChevronDownIcon className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111827]" />
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {[OrderType.DINE_IN, OrderType.TAKEAWAY].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setOrderType(type)}
                                className={`rounded-xl border px-3 py-2 text-[1rem] font-medium transition-colors ${
                                    orderType === type
                                        ? 'border-[#1f2937] bg-[#1f2937] text-white'
                                        : 'border-[#c7cdd6] bg-white text-[#374151] hover:bg-[#f3f4f6]'
                                }`}
                            >
                                {type === OrderType.DINE_IN ? 'Dine In' : 'Takeaway'}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="mt-5">
                    <h3 className="text-[1.9rem] font-medium text-[#4b5563]">Cancellation Policy</h3>
                    <p className="mt-1 text-[1rem] leading-relaxed text-[#8b9097]">
                        Help us reduce food waste by avoiding cancellations after placing your order.
                        Refusing to accept prepared food may lead to account suspension.
                    </p>
                </section>
            </div>

            <div className="fixed bottom-0 left-0 right-0 border-t border-[#d4d7dc] bg-[#eceef0]/95 px-4 pb-5 pt-3 backdrop-blur">
                <div className="mx-auto w-full max-w-md">
                    <button
                        type="button"
                        onClick={handlePlaceOrder}
                        disabled={isLoading}
                        className="flex w-full items-center justify-between rounded-full bg-[#ef4444] px-6 py-3 text-white transition-colors hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        <span className="text-left">
                            <span className="block text-[1.1rem] leading-tight">Total</span>
                            <span className="block text-[1.65rem] font-medium leading-tight">{formatCurrency(totalAmount)}</span>
                        </span>
                        <span className="text-[1.35rem] font-medium">
                            {isLoading ? 'Placing...' : 'Place Order'}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[1.3rem] text-[#374151]">{label}</span>
            <span className="text-[1.65rem] text-[#111827]">{value}</span>
        </div>
    );
}

function formatCurrency(value: number): string {
    return `Rs${value.toFixed(2)}`;
}

function BackIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 19L8 12L15 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3 9C5 9 6 8 7 6" />
            <path d="M21 9C19 9 18 8 17 6" />
            <path d="M3 15C5 15 6 16 7 18" />
            <path d="M21 15C19 15 18 16 17 18" />
            <circle cx="12" cy="12" r="2.5" />
        </svg>
    );
}

function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.2 7.2a.75.75 0 011.06 0L10 10.94l3.74-3.74a.75.75 0 111.06 1.06l-4.27 4.27a.75.75 0 01-1.06 0L5.2 8.26a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
    );
}
