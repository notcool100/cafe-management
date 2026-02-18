'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { employeeService } from '@/lib/api/employee-service';
import { branchService } from '@/lib/api/branch-service';
import { menuService } from '@/lib/api/menu-service';
import { reportService } from '@/lib/api/report-service';
import { Branch } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value || 0);
const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value)}%`;

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        employees: 0,
        branches: 0,
        menuItems: 0,
    });
    const [branches, setBranches] = useState<Branch[]>([]);
    const [earningsTrend, setEarningsTrend] = useState<number[]>([]);
    const [todayEarnings, setTodayEarnings] = useState(0);
    const [earningsChange, setEarningsChange] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 6);

            const [employees, branches, menuItems, salesOverview] = await Promise.all([
                employeeService.getEmployees(),
                branchService.getBranches(),
                menuService.getMenuItems({}),
                reportService.getOverview({
                    startDate: toInputDate(startDate),
                    endDate: toInputDate(endDate),
                }),
            ]);

            setStats({
                employees: employees.length,
                branches: branches.length,
                menuItems: menuItems.length,
            });
            setBranches(branches);

            const salesTrend = (salesOverview.dailyTrend || []).map((point) => point.sales);
            const normalizedTrend = salesTrend.length ? salesTrend : [0];
            const today = normalizedTrend[normalizedTrend.length - 1] || 0;
            const previous = normalizedTrend[normalizedTrend.length - 2] ?? today;
            const change = previous === 0 ? 0 : ((today - previous) / Math.abs(previous)) * 100;

            setEarningsTrend(normalizedTrend);
            setTodayEarnings(today);
            setEarningsChange(change);
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const salesSummaryBase = [38, 62, 85, 48];
    const salesSummary = branches.slice(0, 4).map((branch, index) => ({
        label: branch.name,
        value: salesSummaryBase[index % salesSummaryBase.length],
    }));

    const earningsChart = useMemo(() => {
        if (!earningsTrend.length) {
            return { line: '', area: '', lastX: 200, lastY: 70 };
        }

        const width = 200;
        const maxY = 70;
        const minY = 22;
        const max = Math.max(...earningsTrend, 1);
        const min = Math.min(...earningsTrend, 0);
        const range = Math.max(max - min, 1);

        const points = earningsTrend.map((value, index) => {
            const x = (index * width) / Math.max(earningsTrend.length - 1, 1);
            const y = maxY - ((value - min) / range) * (maxY - minY);
            return { x, y };
        });

        const line = points.map((point) => `${point.x},${point.y}`).join(' ');
        const area = `${points[0].x},${maxY} ${line} ${points[points.length - 1].x},80 ${points[0].x},80`;
        const last = points[points.length - 1];

        return { line, area, lastX: last.x, lastY: last.y };
    }, [earningsTrend]);

    const overview = [
        { label: 'Morning', value: '18%', color: '#cbbbaa' },
        { label: 'Afternoon', value: '33%', color: '#a98d79' },
        { label: 'Evening', value: '44%', color: '#5a3a2e' },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[#9b7d6b]">Dashboard</p>
                    <h1 className="text-3xl md:text-4xl font-semibold text-[#5a3a2e] mt-2">Welcome back</h1>
                    <p className="text-sm text-[#9b7d6b] mt-2">Here's what's happening across your cafe today.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button className="rounded-full border border-[#e2d6c1] bg-[#fff6e6] px-4 py-2 text-sm font-medium text-[#6a4a3a] shadow-[0_6px_18px_rgba(90,58,46,0.08)]">
                        View All
                    </button>
                    <button className="h-11 w-11 rounded-full border border-[#e2d6c1] bg-[#fff6e6] text-[#6a4a3a] shadow-[0_6px_18px_rgba(90,58,46,0.08)] flex items-center justify-center">
                        <BellIcon className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-[#e2d6c1] bg-[#f3e7d2] px-4 py-2 text-sm font-medium text-[#5a3a2e] shadow-[0_6px_18px_rgba(90,58,46,0.08)]">
                        Hi, Admin
                        <span className="h-7 w-7 rounded-full bg-[#5a3a2e] text-[#fffaf0] flex items-center justify-center text-xs font-semibold">
                            A
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/admin/employees" className="block h-full group">
                    <div className="h-full min-h-[152px] rounded-3xl border border-[#e2d6c1] bg-[#f3e7d2] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)] transition-colors duration-200 hover:bg-[#5a3a2e] hover:border-transparent">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[#8b6f5f] group-hover:text-[#f3e7d2]">Total Employees</p>
                            <span className="rounded-full bg-[#fff6e6] border border-[#e2d6c1] px-2 py-1 text-xs font-semibold text-[#5a3a2e] group-hover:bg-[#2f7d53] group-hover:border-[#2f7d53] group-hover:text-[#fffaf0]">+8%</span>
                        </div>
                        <p className="text-4xl font-semibold mt-6 text-[#5a3a2e] group-hover:text-[#fffaf0]">{stats.employees}</p>
                    </div>
                </Link>
                <Link href="/admin/branches" className="block h-full group">
                    <div className="h-full min-h-[152px] rounded-3xl border border-[#e2d6c1] bg-[#f3e7d2] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)] transition-colors duration-200 hover:bg-[#5a3a2e] hover:border-transparent">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[#8b6f5f] group-hover:text-[#f3e7d2]">Total Branches</p>
                            <div className="h-10 w-10 rounded-2xl border border-[#e2d6c1] bg-[#fff6e6] flex items-center justify-center text-[#5a3a2e] group-hover:bg-[#6d4a3b] group-hover:border-[#7f5d4d] group-hover:text-[#fffaf0]">
                                <BuildingIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-4xl font-semibold mt-6 text-[#5a3a2e] group-hover:text-[#fffaf0]">{stats.branches}</p>
                    </div>
                </Link>
                <Link href="/admin/menu" className="block h-full group">
                    <div className="h-full min-h-[152px] rounded-3xl border border-[#e2d6c1] bg-[#f3e7d2] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)] transition-colors duration-200 hover:bg-[#5a3a2e] hover:border-transparent">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-[#8b6f5f] group-hover:text-[#f3e7d2]">Menu Items</p>
                            <div className="h-10 w-10 rounded-2xl border border-[#e2d6c1] bg-[#fff6e6] flex items-center justify-center text-[#5a3a2e] group-hover:bg-[#6d4a3b] group-hover:border-[#7f5d4d] group-hover:text-[#fffaf0]">
                                <MenuIcon className="h-5 w-5" />
                            </div>
                        </div>
                        <p className="text-4xl font-semibold mt-6 text-[#5a3a2e] group-hover:text-[#fffaf0]">{stats.menuItems}</p>
                    </div>
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 rounded-3xl border border-[#e2d6c1] bg-[#fff6e6] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-[#5a3a2e]">Sales Summary</h2>
                        <span className="text-xs text-[#9b7d6b]">Last 7 days</span>
                    </div>
                    <div className="mt-8 grid grid-cols-4 items-end gap-6 h-40">
                        {salesSummary.map((bar) => (
                            <div key={bar.label} className="flex flex-col items-center gap-3">
                                <div className="w-8 rounded-full bg-[#e6d8c6] overflow-hidden flex items-end" style={{ height: '100%' }}>
                                    <div className="w-full rounded-full bg-[#5a3a2e]" style={{ height: `${bar.value}%` }} />
                                </div>
                                <span className="text-xs text-[#8b6f5f]">{bar.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="rounded-3xl border border-[#e2d6c1] bg-[#fff6e6] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-semibold text-[#5a3a2e]">Overview</h3>
                            <button className="rounded-full border border-[#e2d6c1] px-3 py-1 text-xs text-[#8b6f5f]">
                                View All
                            </button>
                        </div>
                        <div className="flex items-center gap-6">
                            <div
                                className="relative h-24 w-24 rounded-full"
                                style={{
                                    background: 'conic-gradient(#5a3a2e 0 44%, #a98d79 0 77%, #cbbbaa 0 100%)',
                                }}
                            >
                                <div className="absolute inset-3 rounded-full bg-[#fff6e6]" />
                            </div>
                            <div className="space-y-2">
                                {overview.map((item) => (
                                    <div key={item.label} className="flex items-center gap-2 text-xs text-[#6a4a3a]">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="w-20">{item.label}</span>
                                        <span className="text-[#8b6f5f]">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-[#e2d6c1] bg-[#fff6e6] p-6 shadow-[0_12px_28px_rgba(90,58,46,0.08)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-[#9b7d6b]">Today earnings</p>
                                <p className="text-lg font-semibold text-[#5a3a2e] mt-1">{formatCurrency(todayEarnings)}</p>
                            </div>
                            <span className="rounded-full bg-[#d7eadf] px-2 py-1 text-xs font-semibold text-[#2f6b3f]">
                                {formatPercent(earningsChange)}
                            </span>
                        </div>
                        <div className="mt-6 h-24">
                            <svg viewBox="0 0 200 80" className="w-full h-full">
                                <defs>
                                    <linearGradient id="earnings" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#8fbc9a" stopOpacity="0.7" />
                                        <stop offset="100%" stopColor="#8fbc9a" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                <polyline
                                    fill="url(#earnings)"
                                    stroke="none"
                                    points={earningsChart.area}
                                />
                                <polyline
                                    fill="none"
                                    stroke="#3c7a57"
                                    strokeWidth="3"
                                    points={earningsChart.line}
                                />
                                <circle cx={earningsChart.lastX} cy={earningsChart.lastY} r="4" fill="#3c7a57" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-semibold text-[#5a3a2e] mb-4">Branches</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {branches.map((branch) => (
                        <div key={branch.id} className="rounded-3xl bg-[#5a3a2e] text-[#fffaf0] p-4 shadow-[0_12px_28px_rgba(90,58,46,0.2)]">
                            <div className="rounded-2xl bg-[#f3e7d2] text-[#5a3a2e] p-4 text-center text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(90,58,46,0.15)]">
                                {branch.name.toLowerCase()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function BuildingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    );
}

function BellIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" />
        </svg>
    );
}

function MenuIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    );
}
