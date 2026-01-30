export type ThemePalette = {
    primary: string;
    secondary: string;
    accent: string;
    background?: string;
    textPrimary?: string;
    textMuted?: string;
    navBackground?: string;
    navText?: string;
    fontFamily?: string;
    googleFont?: string; // raw Google font family name, e.g., "Inter" or "Space Grotesk"
};

export const THEME_STORAGE_KEY = 'theme-palette';

export const defaultPalette: ThemePalette = {
    primary: '#8b5cf6',
    secondary: '#3b82f6',
    accent: '#ec4899',
    background: '#0a0e1a',
    textPrimary: '#ffffff',
    textMuted: '#cbd5e1',
    navBackground: '#0f172a',
    navText: '#e5e7eb',
    fontFamily: "'Inter', sans-serif",
    googleFont: 'Inter',
};

export const themeTemplates: { name: string; description: string; palette: ThemePalette }[] = [
    {
        name: 'Sunset Punch',
        description: 'Bold purple into hot pink with warm accent',
        palette: { primary: '#7c3aed', secondary: '#f97316', accent: '#fb7185', background: '#0f0a1f' },
    },
    {
        name: 'Forest Matcha',
        description: 'Earthy green duo with lime accent',
        palette: { primary: '#16a34a', secondary: '#22c55e', accent: '#a3e635', background: '#0b1310' },
    },
    {
        name: 'Ocean Breeze',
        description: 'Teal to cobalt with aqua accent',
        palette: { primary: '#0ea5e9', secondary: '#2563eb', accent: '#22d3ee', background: '#081019' },
    },
    {
        name: 'Monochrome Glow',
        description: 'Graphite gradients with cyan accent',
        palette: { primary: '#6b7280', secondary: '#111827', accent: '#22d3ee', background: '#06080c' },
    },
];

const setVar = (name: string, value: string) => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(name, value);
};

const loadGoogleFont = (family?: string) => {
    if (typeof document === 'undefined' || !family) return;
    const id = 'dynamic-theme-font';
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    const qsFamily = family.trim().replace(/\s+/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${qsFamily}:wght@400;500;600;700&display=swap`;
    if (existing) {
        existing.href = href;
        return;
    }
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
};

export const applyTheme = (palette: ThemePalette, persist = true) => {
    const primary = palette.primary;
    const secondary = palette.secondary;
    const accent = palette.accent;
    const background = palette.background || '#0a0e1a';
    const textPrimary = palette.textPrimary || '#ffffff';
    const textMuted = palette.textMuted || '#cbd5e1';
    const navBackground = palette.navBackground || '#0f172a';
    const navText = palette.navText || '#e5e7eb';
    const fontFromGoogle = palette.googleFont
        ? `'${palette.googleFont}', ${palette.googleFont.toLowerCase().includes('sans') ? 'sans-serif' : 'sans-serif'}`
        : undefined;
    const fontFamily = fontFromGoogle || palette.fontFamily || "'Inter', sans-serif";
    const surface1 = `color-mix(in srgb, ${background} 88%, #ffffff 12%)`;
    const surface2 = `color-mix(in srgb, ${background} 80%, #ffffff 20%)`;
    const surface3 = `color-mix(in srgb, ${background} 70%, #ffffff 30%)`;
    const borderMuted = `color-mix(in srgb, ${background} 50%, #ffffff 35%)`;

    setVar('--gradient-primary', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
    setVar('--gradient-secondary', `linear-gradient(135deg, ${secondary} 0%, ${accent} 100%)`);
    setVar('--gradient-accent', `linear-gradient(135deg, ${accent} 0%, ${primary} 100%)`);
    setVar('--purple-vivid', primary);
    setVar('--blue-vivid', secondary);
    setVar('--pink-vivid', accent);
    setVar('--color-primary', primary);
    setVar('--color-secondary', secondary);
    setVar('--color-accent', accent);
    setVar('--bg-primary', background);
    setVar('--bg-secondary', surface1);
    setVar('--bg-tertiary', surface2);
    setVar('--surface-1', surface1);
    setVar('--surface-2', surface2);
    setVar('--surface-3', surface3);
    setVar('--border-muted', borderMuted);
    setVar('--text-primary', textPrimary);
    setVar('--text-muted', textMuted);
    setVar('--nav-bg', navBackground);
    setVar('--nav-text', navText);
    setVar('--font-body', fontFamily);
    loadGoogleFont(palette.googleFont || fontFamily?.replace(/['"]/g, '').split(',')[0]);

    if (persist && typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(palette));
    }
};

export const loadTheme = (): ThemePalette | null => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as ThemePalette;
    } catch {
        return null;
    }
};
