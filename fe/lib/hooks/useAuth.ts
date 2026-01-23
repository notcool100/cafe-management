import { useAuthStore } from '../store/auth-store';

export function useAuth() {
    const { user, token, isAuthenticated, isLoading, setAuth, logout, setLoading, isAdmin, isStaff } = useAuthStore();

    return {
        user,
        token,
        isAuthenticated,
        isLoading,
        setAuth,
        logout,
        setLoading,
        isAdmin: isAdmin(),
        isStaff: isStaff(),
    };
}
