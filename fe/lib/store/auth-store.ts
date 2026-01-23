import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    hasHydrated: boolean;

    // Actions
    setAuth: (user: User, accessToken: string, refreshToken: string) => void;
    updateAccessToken: (accessToken: string) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
    setHasHydrated: (state: boolean) => void;

    // Computed values
    isAdmin: () => boolean;
    isStaff: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
            hasHydrated: false,

            setAuth: (user: User, accessToken: string, refreshToken: string) => {
                console.log('🔐 [AuthStore] setAuth called:', {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    hasAccessToken: !!accessToken,
                    hasRefreshToken: !!refreshToken
                });

                // Store tokens in localStorage for API client
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', accessToken);
                    localStorage.setItem('refresh_token', refreshToken);
                    localStorage.removeItem('auth_token'); // Cleanup old
                    console.log('💾 [AuthStore] Tokens saved to localStorage');
                }

                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                });

                console.log('✅ [AuthStore] Auth state updated');
            },

            updateAccessToken: (accessToken: string) => {
                console.log('🔄 [AuthStore] updateAccessToken called');
                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', accessToken);
                    console.log('💾 [AuthStore] New access token saved to localStorage');
                }
                set({ accessToken });
            },

            logout: () => {
                console.log('🚪 [AuthStore] logout called');
                // Remove tokens from localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('auth_token');
                    console.log('🗑️ [AuthStore] Tokens removed from localStorage');
                }

                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                });

                console.log('✅ [AuthStore] Logged out successfully');
            },

            setLoading: (loading: boolean) => {
                console.log('⏳ [AuthStore] setLoading:', loading);
                set({ isLoading: loading });
            },

            setHasHydrated: (state: boolean) => {
                console.log('💧 [AuthStore] setHasHydrated:', state);
                set({ hasHydrated: state });
            },

            isAdmin: () => {
                const { user } = get();
                return user?.role === UserRole.ADMIN;
            },

            isStaff: () => {
                const { user } = get();
                return user?.role === UserRole.STAFF;
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => {
                console.log('🌊 [AuthStore] Starting rehydration from localStorage...');
                return (state) => {
                    console.log('✨ [AuthStore] Rehydration complete:', {
                        hasUser: !!state?.user,
                        isAuthenticated: state?.isAuthenticated,
                        hasAccessToken: !!state?.accessToken,
                        hasRefreshToken: !!state?.refreshToken
                    });
                    state?.setHasHydrated(true);
                };
            },
        }
    )
);
