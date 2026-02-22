'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart-store';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { resolveImageUrl } from '@/lib/utils/image';

interface CartSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
    const { items, getTotal, removeItem, updateQuantity } = useCartStore();
    const total = getTotal();

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-800",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                        <h2 className="text-xl font-bold text-white">Your Order</h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        >
                            <CloseIcon className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <ShoppingBagIcon className="h-16 w-16 text-gray-700 mb-4" />
                                <p className="text-gray-400 text-lg mb-2">Your cart is empty</p>
                                <p className="text-gray-600">Add some delicious items from the menu</p>
                                <Button
                                    className="mt-6"
                                    variant="outline"
                                    onClick={onClose}
                                >
                                    Browse Menu
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {items.map((item) => (
                                    <div key={item.menuItem.id} className="flex gap-4">
                                        {/* Item Image */}
                                        <div className="relative h-20 w-20 flex-shrink-0 rounded-lg bg-gray-800 overflow-hidden">
                                            {resolveImageUrl(item.menuItem.imageUrl) ? (
                                                <Image
                                                    src={resolveImageUrl(item.menuItem.imageUrl) as string}
                                                    alt={item.menuItem.name}
                                                    fill
                                                    sizes="80px"
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-gray-600">
                                                    <ImageIcon className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Item Details */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <h3 className="text-white font-medium line-clamp-1">{item.menuItem.name}</h3>
                                                    <p className="text-purple-400 font-bold ml-2">
                                                        Rs. {(item.menuItem.price * item.quantity).toFixed(2)}
                                                    </p>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    Rs. {item.menuItem.price.toFixed(2)} each
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center bg-gray-800 rounded-lg p-1">
                                                    <button
                                                        onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                                                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <MinusIcon className="h-4 w-4" />
                                                    </button>
                                                    <span className="w-8 text-center text-white text-sm font-medium">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                                                        className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                                    >
                                                        <PlusIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.menuItem.id)}
                                                    className="text-gray-500 hover:text-red-400 text-sm underline transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {items.length > 0 && (
                        <div className="p-6 bg-gray-900 border-t border-gray-800 space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold text-white">
                                <span>Total</span>
                                <span>Rs. {total.toFixed(2)}</span>
                            </div>
                            <Link href="/checkout" onClick={onClose} className="block w-full">
                                <Button fullWidth size="lg" className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                                    Proceed to Checkout
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function ShoppingBagIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
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
