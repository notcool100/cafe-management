'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { LoadingPage } from '@/components/ui/Spinner';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      router.push('/admin');
    } else if (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') {
      router.push('/admin/reports');
    }
  }, [isAuthenticated, user, router]);

  return <LoadingPage />;
}
