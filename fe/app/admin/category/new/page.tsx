'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoryRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin/category');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#efe8cf] text-[#5a3a2e]">
            Redirecting to categories...
        </div>
    );
}
