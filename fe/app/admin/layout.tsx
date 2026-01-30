'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import ProtectedRoute from '@/components/ProtectedRoute';
import { cn } from '@/lib/utils/cn';
import { UserRole } from '@/lib/types';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Reports', href: '/admin/reports', icon: ChartIcon },
    { name: 'Orders', href: '/admin/orders', icon: ClipboardIcon },
    { name: 'Employees', href: '/admin/employees', icon: UsersIcon },
    { name: 'Branches', href: '/admin/branches', icon: BuildingIcon },
    { name: 'Menu Items', href: '/admin/menu', icon: MenuIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isStaffManager = user?.role === UserRole.MANAGER || user?.role === UserRole.EMPLOYEE;
    const staffAllowed = useMemo(() => ['/admin/reports', '/admin/orders', '/admin/employees', '/admin/menu'], []);
    const visibleNavigation = isStaffManager
        ? navigation.filter((item) => staffAllowed.includes(item.href))
        : navigation;

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    useEffect(() => {
        if (isStaffManager) {
            const allowedPrefixes = staffAllowed;
            const isAllowed = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
            if (!isAllowed) {
                router.replace('/admin/reports');
            }
        }
    }, [isStaffManager, pathname, router, staffAllowed]);

    return (
        <ProtectedRoute requiredRole={['ADMIN', 'MANAGER', 'SUPER_ADMIN']}>
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
                {/* Sidebar for desktop - Fixed position */}
                <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col lg:z-50">
                    <div className="flex flex-col flex-grow bg-gray-900 border-r-2 border-gray-800 shadow-2xl">
                        {/* Logo */}
                        <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-gray-800">
                            <h1 className="text-xl font-bold">
                                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                                    ☕ Cafe Admin
                                </span>
                            </h1>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                            {visibleNavigation.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                const Icon = item.icon;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                                            isActive
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                'mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200',
                                                isActive ? 'text-white' : 'text-gray-500 group-hover:text-purple-400'
                                            )}
                                        />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User section */}
                        <div className="flex-shrink-0 p-4 border-t border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                                    title="Logout"
                                >
                                    <LogoutIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main content wrapper - Simple margin approach */}
                <div className="min-h-screen lg:ml-64">
                    {/* Top bar for mobile */}
                    <div className="sticky top-0 z-40 lg:hidden bg-gray-900 border-b border-gray-800 px-4 py-4 shadow-lg">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-bold">
                                <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                                    ☕ Cafe Admin
                                </span>
                            </h1>
                            <button
                                type="button"
                                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition-colors"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                <MenuIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Page content */}
                    <main className="bg-gray-950 p-6 lg:p-8">
                        <div className="max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}

// Icons (simple SVG components)
function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    );
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function BuildingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10V9m-9 8H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2h-1" />
        </svg>
    );
}

function ClipboardIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-4 4h4m-7 4h7m-9 4h9a2 2 0 002-2V7a2 2 0 00-2-2h-1.5a1.5 1.5 0 01-3 0H9a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
