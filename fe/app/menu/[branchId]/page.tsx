'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { menuService } from '@/lib/api/menu-service';
import { branchService } from '@/lib/api/branch-service';
import { MenuItem, MenuCategory, Branch } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import CartSidebar from '@/components/CartSidebar';
import { useCartStore } from '@/lib/store/cart-store';
import Toast from '@/components/ui/Toast';
import { resolveImageUrl } from '@/lib/utils/image';

export default function PublicMenuPage() {
    const params = useParams();
    const branchId = params.branchId as string;

    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [branch, setBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'ALL'>('ALL');
    const [isCartOpen, setIsCartOpen] = useState(false);

    const { addItem, getItemCount } = useCartStore();
    const cartItemCount = getItemCount();

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    useEffect(() => {
        loadData();
    }, [branchId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [branchData, itemsData] = await Promise.all([
                branchService.getBranch(branchId),
                menuService.getPublicMenu(branchId)
            ]);
            setBranch(branchData);
            setMenuItems(itemsData);
        } catch (error) {
            console.error('Failed to load menu:', error);
            setToast({
                message: 'Failed to load menu. Please check the URL or try again.',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToCart = (item: MenuItem) => {
        addItem(item);
        setToast({
            message: `Added ${item.name} to cart`,
            type: 'success',
            isVisible: true,
        });
    };

    const filteredItems = menuItems.filter(item =>
        selectedCategory === 'ALL' || item.category === selectedCategory
    );

    const categories = ['ALL', ...Object.values(MenuCategory)];

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
        <div className="min-h-screen bg-gray-950 pb-20">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            {/* Header */}
            <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                {branch.name}
                            </h1>
                            <p className="text-xs text-gray-400">{branch.location}</p>
                        </div>
                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="relative p-2 text-gray-400 hover:text-white transition-colors"
                        >
                            <ShoppingCartIcon className="h-6 w-6" />
                            {cartItemCount > 0 && (
                                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-purple-600 rounded-full">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Category Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex overflow-x-auto pb-0 hide-scrollbar gap-4 py-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat as MenuCategory | 'ALL')}
                                className={`
                                    whitespace-nowrap px-4 py-2 border-b-2 text-sm font-medium transition-colors
                                    ${selectedCategory === cat
                                        ? 'border-purple-500 text-purple-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                                    }
                                `}
                            >
                                {cat === 'ALL' ? 'All Items' : cat.charAt(0) + cat.slice(1).toLowerCase().replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Menu Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400">No items available in this category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => (
                            <Card key={item.id} variant="glass" className="overflow-hidden flex flex-col h-full">
                                <div className="aspect-video relative bg-gray-800">
                                    {resolveImageUrl(item.imageUrl) ? (
                                        <img
                                            src={resolveImageUrl(item.imageUrl)}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                            <ImageIcon className="h-12 w-12" />
                                        </div>
                                    )}
                                    {!item.available && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Badge variant="danger">Sold Out</Badge>
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-4 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white text-lg line-clamp-1">{item.name}</h3>
                                        <span className="font-bold text-purple-400">${item.price.toFixed(2)}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                                        {item.description}
                                    </p>
                                    <Button
                                        onClick={() => handleAddToCart(item)}
                                        disabled={!item.available}
                                        fullWidth
                                        variant={!item.available ? 'outline' : 'primary'}
                                        className={!item.available ? 'opacity-50 cursor-not-allowed' : ''}
                                    >
                                        {!item.available ? 'Unavailable' : 'Add to Order'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
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

function ImageIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    );
}
