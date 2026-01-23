'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import ProtectedRoute from '@/components/ProtectedRoute';
import { cn } from '@/lib/utils/cn';

const navigation = [
    { name: 'Dashboard', href: '/staff', icon: HomeIcon },
    { name: 'Active Orders', href: '/staff/orders', icon: ClipboardListIcon },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <ProtectedRoute requiredRole={['MANAGER', 'EMPLOYEE', 'ADMIN']}>
            <div className="min-h-screen bg-gray-950">
                {/* Sidebar for desktop */}
                <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                    <div className="flex flex-col flex-grow bg-gray-900 border-r border-gray-800 pt-5">
                        {/* Logo */}
                        <div className="flex items-center flex-shrink-0 px-6 mb-8">
                            <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                Manager Portal
                            </h1>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-3 space-y-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                                            isActive
                                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                'mr-3 h-5 w-5 flex-shrink-0',
                                                isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                                            )}
                                        />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User section */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-800">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="ml-3 flex-1">
                                    <p className="text-sm font-medium text-white">{user?.name}</p>
                                    <div className="flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                                        <p className="text-xs text-gray-500">Active</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="ml-2 text-gray-500 hover:text-white transition-colors"
                                    title="Logout"
                                >
                                    <LogoutIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="lg:pl-64">
                    {/* Top bar for mobile */}
                    <div className="sticky top-0 z-10 lg:hidden bg-gray-900 border-b border-gray-800 px-4 py-3">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                Manager Portal
                            </h1>
                            <button
                                type="button"
                                className="text-gray-400 hover:text-white"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                <MenuIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Page content */}
                    <main className="px-4 py-8 sm:px-6 lg:px-8">
                        {children}
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}

// Icons
function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );
}

function ClipboardListIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    );
}

function MenuIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    );
}

function LogoutIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    );
}
