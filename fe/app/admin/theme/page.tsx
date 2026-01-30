'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Toast from '@/components/ui/Toast';
import { ThemePalette, applyTheme, defaultPalette, loadTheme, themeTemplates } from '@/lib/utils/theme';
import { useAuthStore } from '@/lib/store/auth-store';
import { UserRole } from '@/lib/types';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';

export default function ThemeStudioPage() {
    const [palette, setPalette] = useState<ThemePalette>(defaultPalette);
    const [toast, setToast] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info', isVisible: false });
    const { user } = useAuthStore();

    useEffect(() => {
        const saved = loadTheme();
        if (saved) {
            const timer = setTimeout(() => setPalette(saved), 0);
            return () => clearTimeout(timer);
        }
    }, []);

    const previewGradient = useMemo(
        () => ({
            background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 60%, ${palette.accent} 100%)`,
            fontFamily: palette.fontFamily,
        }),
        [palette]
    );

    const handleChange = (key: keyof ThemePalette, value: string) => {
        setPalette((prev) => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        applyTheme(palette, true);
        setToast({ message: 'Theme applied successfully', type: 'success', isVisible: true });
    };

    const handleReset = () => {
        setPalette(defaultPalette);
        applyTheme(defaultPalette, true);
        setToast({ message: 'Reset to default theme', type: 'info', isVisible: true });
    };

    const handleTemplate = (tpl: ThemePalette) => {
        setPalette(tpl);
    };

    const sampleCards = [
        { title: 'Primary Action', sub: 'Buttons & highlights', tone: palette.primary },
        { title: 'Secondary Surface', sub: 'Borders & tabs', tone: palette.secondary },
        { title: 'Accent Pop', sub: 'Badges & pills', tone: palette.accent },
    ];

    if (user?.role === UserRole.MANAGER || user?.role === UserRole.EMPLOYEE) {
        return (
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Theme Studio</CardTitle>
                    <p className="text-sm text-gray-500">Only admins and super admins can modify theme settings.</p>
                </CardHeader>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white">Theme Studio</h1>
                <p className="text-gray-400">Let admins pick brand colours, preview, and apply instantly.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
                <div className="space-y-4">
                    <Card variant="glass" className="border border-gray-800/70">
                        <CardHeader>
                            <CardTitle>Live Preview</CardTitle>
                            <p className="text-sm text-gray-500">Shows how buttons, badges, and glass cards will look.</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-2xl p-6 text-white border border-white/10 shadow-lg" style={previewGradient}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm uppercase tracking-wide text-white/80">Hero Banner</p>
                                        <h3 className="text-2xl font-bold">CafeOS Brand Preview</h3>
                                    </div>
                                    <Badge variant="success">Sample</Badge>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Button size="sm" variant="primary">Primary CTA</Button>
                                    <Button size="sm" variant="secondary">Secondary</Button>
                                    <Button size="sm" variant="ghost" className="bg-white/10 text-white">Ghost</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {sampleCards.map((card) => (
                                    <div key={card.title} className="rounded-2xl p-4 border border-gray-800 bg-gray-900/70 shadow-sm">
                                        <div className="h-2 w-full rounded-full mb-3" style={{ background: card.tone }}></div>
                                        <h4 className="text-white font-semibold">{card.title}</h4>
                                        <p className="text-sm text-gray-500">{card.sub}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass" className="border border-gray-800/70">
                        <CardHeader>
                            <CardTitle>Page & Navigation Preview</CardTitle>
                            <p className="text-sm text-gray-500">See background, text, and active nav with your palette.</p>
                        </CardHeader>
                        <CardContent>
                            <PagePreview palette={palette} />
                        </CardContent>
                    </Card>
                </div>

                <Card variant="glass" className="border border-gray-800/70">
                    <CardHeader>
                        <CardTitle>Custom Colours</CardTitle>
                        <p className="text-sm text-gray-500">Adjust primary, secondary, and accent. Apply to the whole app.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <ColorField label="Primary" value={palette.primary} onChange={(v) => handleChange('primary', v)} />
                            <ColorField label="Secondary" value={palette.secondary} onChange={(v) => handleChange('secondary', v)} />
                            <ColorField label="Accent" value={palette.accent} onChange={(v) => handleChange('accent', v)} />
                        </div>

                        <div className="mt-4 space-y-3">
                            <div>
                                <h4 className="text-white font-semibold mb-2">Page Background</h4>
                                <ColorField label="Background" value={palette.background || '#0a0e1a'} onChange={(v) => handleChange('background', v)} />
                            </div>

                            <h4 className="text-white font-semibold mb-2">Page Text</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <ColorField label="Text Primary" value={palette.textPrimary || '#ffffff'} onChange={(v) => handleChange('textPrimary', v)} />
                                <ColorField label="Text Muted" value={palette.textMuted || '#cbd5e1'} onChange={(v) => handleChange('textMuted', v)} />
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-white font-semibold">Navigation</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <ColorField label="Nav Background" value={palette.navBackground || '#0f172a'} onChange={(v) => handleChange('navBackground', v)} />
                                    <ColorField label="Nav Text" value={palette.navText || '#e5e7eb'} onChange={(v) => handleChange('navText', v)} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-white font-semibold">Typography</h4>
                                <Select
                                    value={palette.fontFamily || "'Inter', sans-serif"}
                                    onChange={(e) => {
                                        handleChange('fontFamily', e.target.value);
                                    }}
                                    options={[
                                        { value: "'Inter', sans-serif", label: 'Inter (clean default)' },
                                        { value: "'Poppins', sans-serif", label: 'Poppins' },
                                        { value: "'Manrope', sans-serif", label: 'Manrope' },
                                        { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk' },
                                        { value: "'Nunito', sans-serif", label: 'Nunito' },
                                    ]}
                                />
                                <Input
                                    label="Custom Google Font"
                                    placeholder="e.g. DM Sans, Lato, Outfit"
                                    value={palette.googleFont || ''}
                                    onChange={(e) => {
                                        handleChange('googleFont', e.target.value);
                                        if (e.target.value.trim()) {
                                            handleChange('fontFamily', `'${e.target.value.trim()}', sans-serif`);
                                        }
                                    }}
                                    helperText="Type any Google Font family name; we'll load it automatically."
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Button onClick={handleApply}>Apply to site</Button>
                            <Button variant="outline" onClick={handleReset}>Reset</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card variant="glass" className="border border-gray-800/70">
                <CardHeader>
                    <CardTitle>Templates</CardTitle>
                    <p className="text-sm text-gray-500">Click to load a preset, preview above, then Apply.</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {themeTemplates.map((tpl) => (
                        <button
                            key={tpl.name}
                            onClick={() => handleTemplate(tpl.palette)}
                            className="group rounded-2xl border border-gray-800 bg-gray-900/70 p-4 text-left transition hover:border-purple-500/50 hover:shadow-lg"
                        >
                            <div
                                className="h-20 rounded-xl mb-3"
                                style={{ background: `linear-gradient(135deg, ${tpl.palette.primary} 0%, ${tpl.palette.secondary} 60%, ${tpl.palette.accent} 100%)` }}
                            />
                            <h4 className="text-white font-semibold mb-1">{tpl.name}</h4>
                            <p className="text-xs text-gray-500">{tpl.description}</p>
                        </button>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-3">
            <div className="w-10 h-10 rounded-lg border border-white/10 shadow-inner" style={{ background: value }} />
            <div className="flex-1">
                <Input
                    label={label}
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </div>
        </div>
    );
}

function PagePreview({ palette }: { palette: ThemePalette }) {
    const bg = palette.background || '#0a0e1a';
    const text = palette.textPrimary || '#ffffff';
    const muted = palette.textMuted || '#cbd5e1';
    const activeGradient = `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)`;
    const font = palette.fontFamily;

    return (
        <div className="rounded-2xl border border-gray-800 overflow-hidden" style={{ fontFamily: font }}>
            <div
                className="px-4 py-3 flex items-center gap-4"
                style={{ background: bg, color: text }}
            >
                {['Dashboard', 'Orders', 'Menu', 'Staff'].map((item, idx) => {
                    const isActive = idx === 0;
                    return (
                        <span
                            key={item}
                            className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors"
                            style={{
                                background: isActive ? activeGradient : 'transparent',
                                color: isActive ? '#fff' : muted,
                                border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                            }}
                        >
                            {item}
                        </span>
                    );
                })}
            </div>
            <div className="p-5 space-y-3" style={{ background: bg, color: text }}>
                <h4 className="text-lg font-bold">Page Title</h4>
                <p className="text-sm" style={{ color: muted }}>
                    Body text and muted copy adapt to the chosen palette. Cards and glass surfaces will overlay this background.
                </p>
                <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                    <p className="text-sm" style={{ color: text }}>Content block</p>
                    <p className="text-xs" style={{ color: muted }}>Muted details follow text-muted color.</p>
                </div>
            </div>
        </div>
    );
}
