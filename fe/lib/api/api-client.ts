import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Get token from localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

        console.log('🌐 [API] Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            hasToken: !!token,
            tokenPreview: token ? `${token.substring(0, 20)}...` : null
        });

        if (token && token !== 'undefined' && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        console.error('❌ [API] Request error:', error);
        return Promise.reject(error);
    }
);

interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
}

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Response interceptor to handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error: AxiosError<any>) => {
        const originalRequest = error.config as any;

        // Prevent infinite loops
        if (originalRequest._retry) {
            return Promise.reject(error);
        }

        const hadAuthHeader = Boolean(originalRequest?.headers?.Authorization);

        if (error.response?.status === 401) {
            console.log('🚨 [API] 401 Unauthorized - Token may be expired');

            if (isRefreshing) {
                console.log('⏳ [API] Token refresh already in progress, queuing request');
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return apiClient(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;
            const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

            console.log('🔄 [API] Attempting token refresh:', { hasRefreshToken: !!refreshToken });

            if (!refreshToken || refreshToken === 'undefined') {
                console.log('❌ [API] No refresh token available');
                // If the user was never logged in (no tokens or no auth header), don't force a redirect on public pages
                if (!accessToken || !hadAuthHeader) {
                    return Promise.reject(error);
                }
                handleLogout();
                return Promise.reject(error);
            }

            try {
                console.log('🔄 [API] Calling refresh token endpoint');
                // Determine the refresh URL - avoid circular dependency if possible, but basic fetch works
                const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
                    refreshToken
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                console.log('✅ [API] Token refresh successful');

                if (typeof window !== 'undefined') {
                    localStorage.setItem('access_token', accessToken);
                    localStorage.setItem('refresh_token', newRefreshToken);
                    console.log('💾 [API] New tokens saved to localStorage');
                }

                // Update zustand store if possible, but local storage is enough for the retried request
                // We dispatch a custom event or rely on auth store syncing? 
                // For now, simple localStorage update is fine for headers.

                apiClient.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
                originalRequest.headers['Authorization'] = 'Bearer ' + accessToken; // Update failed request

                processQueue(null, accessToken);
                return apiClient(originalRequest);

            } catch (err) {
                console.error('❌ [API] Token refresh failed:', err);
                processQueue(err, null);
                handleLogout();
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        // Transform error for better handling
        const apiError = {
            message: (error.response?.data as any)?.message || error.message || 'An error occurred',
            errors: (error.response?.data as any)?.errors || {},
            status: error.response?.status,
        };

        return Promise.reject(apiError);
    }
);

const handleLogout = () => {
    console.log('🚪 [API] handleLogout called - clearing tokens and redirecting');
    if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_user');
        console.log('🗑️ [API] Tokens cleared, redirecting to /login');
        window.location.href = '/login';
    }
};

export default apiClient;
