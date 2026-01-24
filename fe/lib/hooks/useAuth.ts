import { useAuthStore } from '../store/auth-store';

export function useAuth() {
    const {
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        isLoading,
        setAuth,
        logout,
        setLoading,
        isAdmin,
        isManager,
    } = useAuthStore();

    return {
        user,
        accessToken,
        refreshToken,
        // token is kept for backward compatibility
        token: accessToken,
        isAuthenticated,
        isLoading,
        setAuth,
        logout,
        setLoading,
        isAdmin: isAdmin(),
        isManager: isManager(),
    };
}
