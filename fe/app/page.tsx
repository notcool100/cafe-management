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
    } else if (user?.role === 'ADMIN') {
      router.push('/admin');
    } else if (user?.role === 'STAFF') {
      router.push('/staff');
    }
  }, [isAuthenticated, user, router]);

  return <LoadingPage />;
}
