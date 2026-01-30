'use client';

import { useEffect } from 'react';
import { applyTheme, loadTheme, defaultPalette } from '@/lib/utils/theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const saved = loadTheme() || defaultPalette;
        applyTheme(saved, false);
    }, []);

    return <>{children}</>;
}
