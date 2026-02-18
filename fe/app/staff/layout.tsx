'use client';

import { useEffect, useState } from 'react';
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
    const isNavItemActive = (href: string) =>
        href === '/staff' ? pathname === href : pathname === href || pathname.startsWith(href + '/');

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [sidebarOpen]);

    return (
        <ProtectedRoute requiredRole={['MANAGER', 'EMPLOYEE', 'ADMIN', 'SUPER_ADMIN']}>
            <div className="min-h-screen bg-[#fbf5e8] text-[#5a3a2e]">
                <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex lg:flex-col lg:z-50">
                    <div className="flex flex-col flex-grow border-r border-[#e4d7c2] shadow-[6px_0_24px_rgba(90,58,46,0.08)] bg-[#f3e7d2] text-[#5a3a2e]">
                        <div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-[#e4d7c2]">
                            <h1 className="text-xl font-semibold tracking-tight text-[#5a3a2e]">Cafe Staff</h1>
                        </div>

                        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                            {navigation.map((item) => {
                                const isActive = isNavItemActive(item.href);
                                const Icon = item.icon;
                                const iconColor = isActive ? '#fffaf0' : '#5a3a2e';

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                                            isActive ? 'shadow-[0_8px_20px_rgba(90,58,46,0.25)]' : 'hover:bg-[#efe2cd]'
                                        )}
                                        style={{
                                            backgroundColor: isActive ? '#5a3a2e' : undefined,
                                            color: isActive ? '#fffaf0' : '#5a3a2e',
                                        }}
                                    >
                                        <span style={{ color: iconColor }}>
                                            <Icon className="mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200" />
                                        </span>
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="flex-shrink-0 p-4 border-t border-[#e4d7c2]">
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-[#5a3a2e] flex items-center justify-center text-[#fffaf0] font-bold shadow-[0_6px_16px_rgba(90,58,46,0.25)]">
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[#3e2a21] truncate">{user?.name}</p>
                                    <p className="text-xs text-[#8b6f5f] truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex-shrink-0 p-2 text-[#8b6f5f] hover:text-[#c5533a] transition-colors rounded-lg hover:bg-[#f3ddd4]"
                                    title="Logout"
                                >
                                    <LogoutIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="min-h-screen lg:ml-64">
                    <div
                        className={cn(
                            'fixed inset-0 z-50 lg:hidden',
                            sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
                        )}
                        aria-hidden={!sidebarOpen}
                    >
                        <div
                            className={cn(
                                'absolute inset-0 bg-black/60 transition-opacity duration-200',
                                sidebarOpen ? 'opacity-100' : 'opacity-0'
                            )}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <aside
                            className={cn(
                                'absolute left-0 top-0 h-full w-72 max-w-[85vw] transform border-r border-[#e4d7c2] shadow-[6px_0_24px_rgba(90,58,46,0.08)] transition-transform duration-300 bg-[#f3e7d2] text-[#5a3a2e]',
                                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                            )}
                        >
                            <div className="flex h-full flex-col">
                                <div className="flex items-center justify-between px-6 py-5 border-b border-[#e4d7c2]">
                                    <h2 className="text-lg font-semibold tracking-tight text-[#5a3a2e]">Cafe Staff</h2>
                                    <button
                                        type="button"
                                        className="text-[#8b6f5f] hover:text-[#5a3a2e] p-2 rounded-lg hover:bg-[#efe2cd] transition-colors"
                                        onClick={() => setSidebarOpen(false)}
                                        aria-label="Close menu"
                                    >
                                        <CloseIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                                    {navigation.map((item) => {
                                        const isActive = isNavItemActive(item.href);
                                        const Icon = item.icon;
                                        const iconColor = isActive ? '#fffaf0' : '#5a3a2e';

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={cn(
                                                    'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                                                    isActive
                                                        ? 'shadow-[0_8px_20px_rgba(90,58,46,0.25)]'
                                                        : 'hover:bg-[#efe2cd]'
                                                )}
                                                style={{
                                                    backgroundColor: isActive ? '#5a3a2e' : undefined,
                                                    color: isActive ? '#fffaf0' : '#5a3a2e',
                                                }}
                                            >
                                                <span style={{ color: iconColor }}>
                                                    <Icon className="mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-200" />
                                                </span>
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>

                                <div className="flex-shrink-0 p-4 border-t border-[#e4d7c2]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0">
                                            <div className="h-10 w-10 rounded-full bg-[#5a3a2e] flex items-center justify-center text-[#fffaf0] font-bold shadow-[0_6px_16px_rgba(90,58,46,0.25)]">
                                                {user?.name?.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-[#3e2a21] truncate">{user?.name}</p>
                                            <p className="text-xs text-[#8b6f5f] truncate">{user?.email}</p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex-shrink-0 p-2 text-[#8b6f5f] hover:text-[#c5533a] transition-colors rounded-lg hover:bg-[#f3ddd4]"
                                            title="Logout"
                                        >
                                            <LogoutIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div className="sticky top-0 z-40 lg:hidden border-b border-[#e4d7c2] px-4 py-4 shadow-[0_10px_30px_rgba(90,58,46,0.08)] bg-[#f3e7d2] text-[#5a3a2e]">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-semibold tracking-tight text-[#5a3a2e]">Cafe Staff</h1>
                            <button
                                type="button"
                                className="text-[#8b6f5f] hover:text-[#5a3a2e] p-2 rounded-lg hover:bg-[#efe2cd] transition-colors"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                            >
                                <MenuIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    <main className="bg-[#fbf5e8] p-6 lg:p-8">
                        <div className="max-w-7xl mx-auto">{children}</div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}

function HomeIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
        </svg>
    );
}

function ClipboardListIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
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
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
        </svg>
    );
}

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}
