import { useAuthStore } from '../store/auth-store';

export function useAuth() {
    const { user, token, isAuthenticated, isLoading, setAuth, logout, setLoading, isAdmin, isManager } = useAuthStore();

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        setAuth,
        logout,
        setLoading,
        isAdmin: isAdmin(),
        isManager: isManager(),
    };
}
