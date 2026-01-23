'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { LoadingPage } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?:
        | 'ADMIN'
        | 'MANAGER'
        | 'EMPLOYEE'
        | 'SUPER_ADMIN'
        | Array<'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'SUPER_ADMIN'>;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const router = useRouter();
    const { isAuthenticated, user, accessToken, refreshToken, hasHydrated, setHasHydrated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : null;

    console.log('🔒 [ProtectedRoute] Render:', {
        hasHydrated,
        isAuthenticated,
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        requiredRole: allowedRoles,
        isLoading
    });

    // CRITICAL FIX: Manually set hydrated on mount if Zustand persist callback doesn't fire
    useEffect(() => {
        if (!hasHydrated) {
            console.log('🔧 [ProtectedRoute] Manually checking hydration status...');
            // Give Zustand persist a moment to hydrate
            const timer = setTimeout(() => {
                if (!hasHydrated) {
                    console.log('⚠️ [ProtectedRoute] Zustand persist callback did not fire, manually setting hydrated');
                    setHasHydrated(true);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [hasHydrated, setHasHydrated]);

    useEffect(() => {
        // Sync tokens to localStorage if they exist in store but not in localStorage
        if (isAuthenticated && accessToken && refreshToken) {
            const localAccessToken = localStorage.getItem('access_token');
            const localRefreshToken = localStorage.getItem('refresh_token');

            console.log('🔄 [ProtectedRoute] Token sync check:', {
                hasLocalAccessToken: !!localAccessToken,
                hasLocalRefreshToken: !!localRefreshToken,
                needsSync: !localAccessToken || !localRefreshToken
            });

            if (!localAccessToken) {
                localStorage.setItem('access_token', accessToken);
                console.log('✅ [ProtectedRoute] Synced access_token to localStorage');
            }
            if (!localRefreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
                console.log('✅ [ProtectedRoute] Synced refresh_token to localStorage');
            }
        }
    }, [isAuthenticated, accessToken, refreshToken]);

    useEffect(() => {
        console.log('🎯 [ProtectedRoute] Auth check effect:', { hasHydrated, isAuthenticated });

        // Check localStorage directly to debug
        const storageData = localStorage.getItem('auth-storage');
        const localAccessToken = localStorage.getItem('access_token');
        const localRefreshToken = localStorage.getItem('refresh_token');

        console.log('🔍 [ProtectedRoute] localStorage contents:', {
            hasAuthStorage: !!storageData,
            authStoragePreview: storageData ? storageData.substring(0, 100) + '...' : null,
            hasLocalAccessToken: !!localAccessToken,
            hasLocalRefreshToken: !!localRefreshToken
        });

        // DEBUGGER: Pause here to inspect state
        if (!hasHydrated && !isAuthenticated) {
            debugger; // This will pause execution - check localStorage and Zustand state in DevTools
        }

        // Don't check auth until Zustand persist has rehydrated
        if (!hasHydrated) {
            console.log('⏳ [ProtectedRoute] Waiting for hydration...');
            return;
        }

        console.log('✨ [ProtectedRoute] Hydration complete, checking auth...');

        if (!isAuthenticated) {
            console.log('❌ [ProtectedRoute] NOT authenticated, redirecting to /login');
            router.push('/login');
            return;
        }

        console.log('✅ [ProtectedRoute] Authenticated!');

        if (allowedRoles && (!user?.role || !allowedRoles.includes(user.role))) {
            console.log('⚠️ [ProtectedRoute] Role mismatch:', {
                required: allowedRoles,
                actual: user?.role
            });

            // Redirect to appropriate dashboard based on actual role
            if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
                console.log('🔀 [ProtectedRoute] Redirecting to /admin');
                router.push('/admin');
            } else if (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') {
                console.log('🔀 [ProtectedRoute] Redirecting to /staff');
                router.push('/staff');
            } else {
                console.log('🔀 [ProtectedRoute] Redirecting to /');
                router.push('/');
            }
            return;
        }

        console.log('🎉 [ProtectedRoute] All checks passed, rendering protected content');
        setIsLoading(false);
    }, [isAuthenticated, user, router, hasHydrated, allowedRoles ? allowedRoles.join(',') : '']);

    if (!hasHydrated || isLoading) {
        console.log('⌛ [ProtectedRoute] Showing loading page');
        return <LoadingPage />;
    }

    console.log('📄 [ProtectedRoute] Rendering children');
    return <>{children}</>;
}
