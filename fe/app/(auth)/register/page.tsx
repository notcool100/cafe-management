'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { authService } from '@/lib/api/auth-service';
import { useAuthStore } from '@/lib/store/auth-store';
import { registerSchema, RegisterFormData } from '@/lib/utils/validation';
import { UserRole } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegisterPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: UserRole.MANAGER,
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        try {
            setIsLoading(true);
            setError('');

            const response = await authService.register(data);
            setAuth(response.user, response.accessToken, response.refreshToken);

            // Redirect based on role
            if (response.user.role === 'ADMIN') {
                router.push('/admin');
            } else if (response.user.role === 'MANAGER' || response.user.role === 'EMPLOYEE') {
                router.push('/admin/reports');
            } else {
                router.push('/');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -inset-[10px] opacity-50">
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
                    <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000" />
                    <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-500" />
                </div>
            </div>

            {/* Register card */}
            <div className="w-full max-w-md relative z-10 animate-slide-up">
                <div className="glass-card p-8 rounded-2xl shadow-2xl">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                            Create Account
                        </h1>
                        <p className="text-gray-400">Join our cafe management system</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Register form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <Input
                            label="Full Name"
                            type="text"
                            {...register('name')}
                            error={errors.name?.message}
                        />

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

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400">Role</label>
                            <select
                                {...register('role')}
                                className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-3 text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-500/30"
                            >
                                <option value={UserRole.ADMIN}>Admin</option>
                                <option value={UserRole.MANAGER}>Manager</option>
                                <option value={UserRole.EMPLOYEE}>Employee</option>
                            </select>
                            {errors.role && (
                                <p className="text-sm text-red-400">{errors.role.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            className="mt-6"
                        >
                            Create Account
                        </Button>
                    </form>

                    {/* Login link */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-400 text-sm">
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                            >
                                Sign in
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
