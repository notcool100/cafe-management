'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { menuService } from '@/lib/api/menu-service';
import { MenuItem, Branch, Order } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import CartSidebar from '@/components/CartSidebar';
import { useCartStore } from '@/lib/store/cart-store';
import Toast from '@/components/ui/Toast';
import { resolveImageUrl } from '@/lib/utils/image';
import { orderService } from '@/lib/api/order-service';
import { getOrCreateDeviceId } from '@/lib/utils/device';

export default function PublicMenuPage() {
    const params = useParams();
    const branchId = params.branchId as string;

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [branch, setBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTab, setCurrentTab] = useState<'MENU' | 'ORDERS'>('MENU');
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

    const { addItem, getItemCount } = useCartStore();
    const cartItemCount = getItemCount();

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await menuService.getPublicMenu(branchId);
            setBranch(data.branch);
            setMenuItems(data.menuItems);
        } catch (error) {
            console.error('Failed to load menu:', error);
            setBranch(null);
            setMenuItems([]);
            setToast({
                message: 'Failed to load menu. Please check the URL or try again.',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddToCart = (item: MenuItem) => {
        addItem({ ...item, branchId });
        setToast({
            message: `Added ${item.name} to cart`,
            type: 'success',
            isVisible: true,
        });
    };

    const handleOpenImagePreview = (item: MenuItem) => {
        const imageSrc = resolveImageUrl(item.imageUrl);
        if (imageSrc) {
            setPreviewImage({
                src: imageSrc as string,
                alt: item.name,
            });
        }
    };

    const handleCloseImagePreview = () => {
        setPreviewImage(null);
    };

    useEffect(() => {
        if (!previewImage) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPreviewImage(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [previewImage]);

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const categories = useMemo(() => {
        const unique = new Set<string>();
        menuItems.forEach((item) => {
            if (!item.category) return;
            const value = item.category.trim();
            if (value) {
                unique.add(value);
            }
        });
        return ['ALL', ...Array.from(unique)];
    }, [menuItems]);

    useEffect(() => {
        if (selectedCategory === 'ALL') return;
        if (!categories.includes(selectedCategory)) {
            setSelectedCategory('ALL');
        }
    }, [categories, selectedCategory]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!branch) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold text-white mb-2">Branch Not Found</h1>
                <p className="text-gray-400">The cafe branch you are looking for does not exist.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 p-4" style={{ background: '#f6fbfa' }}>
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="w-full max-w-md mx-auto">
                {/* Search bar */}
                <div className="flex items-center justify-between mb-3">
                    <button className="icon-btn">
                        <BackIcon className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="flex-1 mx-2 relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search Dishes"
                            className="search-input w-full pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="icon-btn">
                            <ShareIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
                {/* Top Card (matches screenshot) */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                                {resolveImageUrl(branch.avatar || branch.imageUrl) ? (
                                    <Image
                                        src={resolveImageUrl(branch.avatar || branch.imageUrl) as string}
                                        alt={branch.name}
                                        width={56}
                                        height={56}
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="bg-gray-300 w-12 h-12 rounded-md" />
                                )}
                            </div>

                            <div className="flex-1">
                                <h2 className="text-xl font-semibold text-black leading-tight">{branch.name}</h2>
                                <p className="text-xs text-gray-800">{branch.location}</p>
                            </div>

                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative p-2 text-gray-900 hover:text-black transition-colors"
                                aria-label="Open cart"
                            >
                                <ShoppingCartIcon className="h-6 w-6" />
                                {cartItemCount > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-purple-600 rounded-full -translate-x-1/4 -translate-y-1/4">
                                        {cartItemCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="mt-3">
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                                {categories.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`chip ${selectedCategory === cat ? 'bg-purple-600 text-gra' : ''}`}
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {formatCategoryLabel(cat)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs row (Waffles / Food / Live Orders) */}
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 flex items-center justify-center gap-3">
                        <button
                            className={currentTab === 'MENU' ? 'tab-active' : 'tab-outline'}
                            onClick={() => setCurrentTab('MENU')}
                        >
                            Menu
                        </button>
                        <button
                            className={currentTab === 'ORDERS' ? 'tab-active' : 'tab-outline'}
                            onClick={() => setCurrentTab('ORDERS')}
                        >
                            Live Orders
                        </button>
                    </div>
                </div>
                {/* Menu heading */}
                <h1 className="text-2xl font-semibold text-black mt-4 mb-1">Menu</h1>
                {selectedCategory !== 'ALL' && (
                    <h2 className="text-lg text-gray-700 mb-2">{selectedCategory}</h2>
                )}

                {/* Menu List */}
                <main className="mt-4">
                    {currentTab === 'MENU' ? (
                        filteredItems.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-800">No items available in this category.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl mt-2 overflow-hidden">
                                {filteredItems.map((item) => {
                                    const description = item.description?.trim();

                                    return (
                                        <div key={item.id} className="px-4 py-4 border-b last:border-b-0 border-gray-200 flex items-center justify-between">
                                            <div className="flex-1 pr-4">
                                                <h3 className="text-black font-semibold text-base">{item.name}</h3>
                                                {description ? (
                                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
                                                ) : null}
                                                <div className="text-sm text-gray-800 mt-2">Rs. {item.price.toFixed(0)}</div>
                                            </div>

                                        <div className="flex flex-col items-center w-24">
                                            <div
                                                className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                                                onClick={() => handleOpenImagePreview(item)}
                                            >
                                                {resolveImageUrl(item.imageUrl) ? (
                                                    <Image src={resolveImageUrl(item.imageUrl) as string} alt={item.name} width={64} height={64} className="object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                disabled={!item.available}
                                                className={`add-btn mt-3 ${!item.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                ADD
                                            </button>
                                        </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <LiveOrdersSection branchId={branchId} />
                    )}
                </main>
            </div>

            {/* Mobile fixed checkout bar */}
            {cartItemCount > 0 && (
                <div className="fixed bottom-4 left-0 right-0 z-40 flex items-center justify-center px-4">
                    <div className="w-full max-w-md glass-card border border-gray-200 px-4 py-3 rounded-full flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-700">{cartItemCount} item{cartItemCount > 1 ? 's' : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsCartOpen(true)} className="checkout-btn">Checkout</button>
                        </div>
                    </div>
                </div>
            )}

            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            {/* Menu Item Image Preview */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[60] bg-black/70 p-4 flex items-center justify-center"
                    onClick={handleCloseImagePreview}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Menu item image preview"
                >
                    <div
                        className="relative w-full max-w-lg"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            onClick={handleCloseImagePreview}
                            className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white text-gray-700 shadow-lg hover:bg-gray-100 flex items-center justify-center z-10"
                            aria-label="Close image preview"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <img
                            src={previewImage.src}
                            alt={previewImage.alt}
                            className="w-full max-h-[85vh] object-contain rounded-2xl bg-white p-2 shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function ShoppingCartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
    );
}

function BackIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
    );
}

function ShareIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 8l4 4m0 0l-4 4m4-4H9" />
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

function formatCategoryLabel(value?: string) {
    if (!value) return 'Item';
    const trimmed = value.trim();
    if (!trimmed) return 'Item';
    const normalized = trimmed.replace(/_/g, ' ');
    const shouldTitleCase = trimmed === trimmed.toUpperCase() || trimmed.includes('_');
    if (!shouldTitleCase) return normalized;
    return normalized.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function LiveOrdersSection({ branchId }: { branchId: string }) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        try {
            setIsLoading(true);
            const deviceId = getOrCreateDeviceId();
            const data = await orderService.getOrdersByDevice(deviceId);
            // Filter by branchId if needed, or show all for this device
            setOrders(data.filter((o: Order) => o.branchId === branchId));
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        loadOrders();
        // Refresh every 30 seconds
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
    }, [loadOrders]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner size="md" />
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-900 mb-2">No active orders found.</p>
                <p className="text-sm text-gray-900">Place an order to see it here!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">Token</span>
                                <span className="text-2xl font-bold text-purple-600">
                                    #{order.tokenNumber || '---'}
                                </span>
                            </div>
                            <div className="text-xs text-gray-900">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <StatusBadge status={order.status} />
                    </div>

                    <div className="space-y-2 border-t border-gray-50 pt-3">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-900">
                                    <span className="font-semibold">{item.quantity}x</span> {item.menuItem?.name || 'Item'}
                                </span>
                                <span className="text-gray-900">Rs. {((item.price || 0) * item.quantity).toFixed(0)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-50">
                        <span className="text-sm font-semibold text-gray-900">Total</span>
                        <span className="text-base font-bold text-gray-900">Rs. {order.totalAmount.toFixed(0)}</span>
                    </div>
                </div>
            ))}

            <button
                onClick={loadOrders}
                className="w-full py-3 text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
                Refresh Status
            </button>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { label: string, classes: string }> = {
        PENDING: { label: 'Pending', classes: 'bg-gray-100 text-gray-900' },
        PREPARING: { label: 'Preparing', classes: 'bg-blue-100 text-blue-600 animate-pulse' },
        READY: { label: 'Ready', classes: 'bg-green-100 text-green-600 font-bold' },
        COMPLETED: { label: 'Completed', classes: 'bg-green-50 text-green-500' },
        CANCELLED: { label: 'Cancelled', classes: 'bg-red-100 text-red-600' },
    };

    const config = configs[status] || configs.PENDING;

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.classes}`}>
            {config.label}
        </span>
    );
}
