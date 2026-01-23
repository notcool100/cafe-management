'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { authService } from '@/lib/api/auth-service';
import { useAuthStore } from '@/lib/store/auth-store';
import { loginSchema, LoginFormData } from '@/lib/utils/validation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        try {
            console.log('🔑 [Login] Submitting login form:', { email: data.email });
            setIsLoading(true);
            setError('');

            const response = await authService.login(data);
            console.log('✅ [Login] Login API response:', {
                userId: response.user.id,
                email: response.user.email,
                role: response.user.role,
                hasAccessToken: !!response.accessToken,
                hasRefreshToken: !!response.refreshToken
            });

            setAuth(response.user, response.accessToken, response.refreshToken);
            console.log('💾 [Login] Auth state updated via setAuth');

            // Redirect based on role
            if (response.user.role === 'ADMIN') {
                console.log('🔀 [Login] Redirecting to /admin');
                router.push('/admin');
            } else if (response.user.role === 'MANAGER' || response.user.role === 'EMPLOYEE') {
                console.log('🔀 [Login] Redirecting to /admin/reports');
                router.push('/admin/reports');
            } else {
                console.log('🔀 [Login] Redirecting to /');
                router.push('/');
            }
        } catch (err: any) {
            console.error('❌ [Login] Login failed:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
                    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000" />
                    <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500" />
                </div>
            </div>

            {/* Login card */}
            <div className="w-full max-w-md relative z-10 animate-slide-up">
                <div className="glass-card p-8 rounded-2xl shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                            Welcome Back
                        </h1>
                        <p className="text-gray-400">Sign in to your account</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Login form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <Input
                            label="Email"
                            type="email"
                            {...register('email')}
                            error={errors.email?.message}
                        />

                        <Input
                            label="Password"
                            type="password"
                            {...register('password')}
                            error={errors.password?.message}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            className="mt-6"
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Register link */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <Link
                                href="/register"
                                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                            >
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-sm mt-6">
                    Cafe Management System © 2026
                </p>
            </div>
        </div>
    );
}
