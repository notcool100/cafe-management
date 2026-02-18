'use client';

import { useEffect, useMemo, useState } from 'react';
import { branchService } from '@/lib/api/branch-service';
import { reportService } from '@/lib/api/report-service';
import { Branch, ReportOverview, UserRole } from '@/lib/types';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import { useAuthStore } from '@/lib/store/auth-store';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(value || 0);

const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value)}%`;

const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value || 0);

function buildTrendPoints(values: number[], width: number, height: number, padding = 24) {
    if (!values.length) {
        return '';
    }

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);

    return values
        .map((value, index) => {
            const x = padding + (index * (width - padding * 2)) / Math.max(values.length - 1, 1);
            const y = height - padding - ((value - min) / range) * (height - padding * 2);
            return `${x},${y}`;
        })
        .join(' ');
}

const defaultMonths = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

export default function ReportsPage() {
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;

    const [branches, setBranches] = useState<Branch[]>([]);
    const [report, setReport] = useState<ReportOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });

    const [filters, setFilters] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);

        return {
            branchId: isManager && user?.branchId ? user.branchId : 'all',
            startDate: toInputDate(start),
            endDate: toInputDate(end),
            range: '30',
        };
    });

    useEffect(() => {
        const loadBranches = async () => {
            try {
                if (isManager && user?.branchId) {
                    if (user.branch) {
                        setBranches([user.branch as Branch]);
                    }
                    return;
                }
                const data = await branchService.getBranches();
                setBranches(data);
            } catch {
                setToast({
                    message: 'Unable to load branches.',
                    type: 'error',
                    isVisible: true,
                });
            }
        };

        void loadBranches();
    }, [isManager, user?.branch, user?.branchId]);

    useEffect(() => {
        const fetchReport = async () => {
            setIsLoading(true);
            try {
                const data = await reportService.getOverview({
                    branchId: filters.branchId !== 'all' ? filters.branchId : undefined,
                    startDate: filters.startDate,
                    endDate: filters.endDate,
                });
                setReport(data);
            } catch (error: unknown) {
                setToast({
                    message: error instanceof Error ? error.message : 'Failed to load report data.',
                    type: 'error',
                    isVisible: true,
                });
            } finally {
                setIsLoading(false);
            }
        };

        void fetchReport();
    }, [filters.branchId, filters.endDate, filters.startDate]);

    const branchName = useMemo(() => {
        if (filters.branchId === 'all') {
            return 'All Branches';
        }
        return branches.find((branch) => branch.id === filters.branchId)?.name || user?.branch?.name || 'Branch';
    }, [branches, filters.branchId, user?.branch?.name]);

    const trendValues = useMemo(() => report?.dailyTrend?.map((point) => point.sales) || [], [report?.dailyTrend]);
    const plottedValues = useMemo(() => {
        if (trendValues.length <= 7) {
            return trendValues;
        }

        const chunk = Math.ceil(trendValues.length / 7);
        const sampled: number[] = [];
        for (let i = 0; i < trendValues.length; i += chunk) {
            sampled.push(trendValues.slice(i, i + chunk).reduce((sum, value) => sum + value, 0) / Math.min(chunk, trendValues.length - i));
        }
        return sampled.slice(0, 7);
    }, [trendValues]);

    const monthLabels = useMemo(() => {
        if (!report?.dailyTrend?.length) {
            return defaultMonths;
        }

        if (report.dailyTrend.length <= 7) {
            return report.dailyTrend.map((point) =>
                new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            );
        }

        const step = Math.floor(report.dailyTrend.length / 7);
        const labels: string[] = [];
        for (let i = 0; i < report.dailyTrend.length && labels.length < 7; i += step) {
            labels.push(new Date(report.dailyTrend[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        return labels.length ? labels : defaultMonths;
    }, [report?.dailyTrend]);

    const yAxisLabels = useMemo(() => {
        const maxValue = Math.max(...trendValues, 0);
        if (maxValue <= 0) {
            return [0, 0, 0, 0, 0];
        }

        const step = maxValue / 4;
        return [0, 1, 2, 3, 4].map((index) => Math.round(step * index));
    }, [trendValues]);

    const trendPath = useMemo(() => buildTrendPoints(plottedValues, 430, 230), [plottedValues]);
    const trendShadowPath = useMemo(
        () => buildTrendPoints(plottedValues.map((value, index) => value * (0.9 + index * 0.01)), 430, 230),
        [plottedValues],
    );

    const growth = useMemo(() => {
        if (trendValues.length < 2 || trendValues[0] === 0) {
            return 0;
        }
        return ((trendValues[trendValues.length - 1] - trendValues[0]) / Math.abs(trendValues[0])) * 100;
    }, [trendValues]);

    const peak = useMemo(() => {
        if (!report?.dailyTrend.length) {
            return null;
        }
        return report.dailyTrend.reduce((max, day) => (day.sales > max.sales ? day : max));
    }, [report?.dailyTrend]);

    const peakOrderDay = useMemo(() => {
        if (!report?.dailyTrend.length) {
            return null;
        }
        return report.dailyTrend.reduce((max, day) => (day.orders > max.orders ? day : max));
    }, [report?.dailyTrend]);

    const applyRange = (days: string) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (Number(days) - 1));

        setFilters((prev) => ({
            ...prev,
            range: days,
            startDate: toInputDate(start),
            endDate: toInputDate(end),
        }));
    };

    const onDateChange = (field: 'startDate' | 'endDate', value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
            range: 'custom',
        }));
    };

    const onBranchChange = (branchId: string) => {
        setFilters((prev) => ({
            ...prev,
            branchId,
        }));
    };

    const selectedRangeLabel = useMemo(() => {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        })}`;
    }, [filters.endDate, filters.startDate]);

    return (
        <div className="min-h-screen bg-[#eee8cf] px-4 py-4 md:px-8 md:py-6 text-[#231b17]">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast((prev) => ({ ...prev, isVisible: false }))}
            />

            <div className="mx-auto w-full max-w-[1240px]">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold leading-tight sm:text-[36px]">Dashboard</h1>
                        <p className="mt-0.5 text-2xl font-semibold leading-tight sm:text-[32px]">Revenue</p>
                    </div>
                    <p className="pt-1 text-base font-medium">Hi, {user?.name || 'User'}</p>
                </div>

                {isLoading ? (
                    <div className="flex h-72 items-center justify-center rounded-[22px] border-4 border-[#8e7871] bg-[#937f77]">
                        <Spinner size="lg" />
                    </div>
                ) : (
                    <div className="rounded-[22px] border-[6px] border-[#8e7871] bg-[#8f7b76] p-[3px] shadow-[0_8px_18px_rgba(55,39,33,0.22)]">
                        <div className="grid gap-[2px] rounded-[16px] lg:grid-cols-[1fr_1fr]">
                            <div className="rounded-[15px] bg-[#8f7b76] p-4 md:p-5 text-[#f4eee9] lg:rounded-r-none">
                                <div className="mb-2 flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-semibold leading-none text-[#130e0c] sm:text-3xl lg:text-[40px]">{branchName}</h2>
                                        <p className="mt-1 text-sm text-white/80">{selectedRangeLabel}</p>
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            <p className="text-2xl font-semibold leading-none sm:text-3xl lg:text-[38px]">{formatCurrency(report?.totals.netSales || 0)}</p>
                                            <span className="rounded-full border border-black/30 bg-[#2f6547] px-2 py-0.5 text-[13px] font-semibold text-white">
                                                {formatPercent(growth)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                                        <select
                                            className="w-full rounded-lg border border-[#6a4a3d] bg-[#4c3026] px-3 py-2 text-sm font-semibold leading-none text-[#f3e9dd] outline-none sm:w-auto sm:text-[16px]"
                                            value={filters.branchId}
                                            onChange={(e) => onBranchChange(e.target.value)}
                                            disabled={isManager}
                                        >
                                            {!isManager ? <option value="all">All Branches</option> : null}
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            className="w-full rounded-lg border border-[#6a4a3d] bg-[#4c3026] px-3 py-2 text-base font-semibold leading-none text-[#f3e9dd] outline-none sm:w-auto sm:text-[18px]"
                                            value={filters.range}
                                            onChange={(e) => {
                                                if (e.target.value === 'custom') {
                                                    setFilters((prev) => ({ ...prev, range: 'custom' }));
                                                    return;
                                                }
                                                applyRange(e.target.value);
                                            }}
                                        >
                                            <option value="7">Last 7 days</option>
                                            <option value="30">Last 30 days</option>
                                            <option value="90">Last 90 days</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                        <div className="flex flex-wrap items-center gap-1 text-xs text-[#f3e9dd] sm:justify-end">
                                            <input
                                                type="date"
                                                className="rounded border border-[#6a4a3d] bg-[#4c3026] px-2 py-1 outline-none"
                                                value={filters.startDate}
                                                onChange={(e) => onDateChange('startDate', e.target.value)}
                                                max={filters.endDate}
                                            />
                                            <span>to</span>
                                            <input
                                                type="date"
                                                className="rounded border border-[#6a4a3d] bg-[#4c3026] px-2 py-1 outline-none"
                                                value={filters.endDate}
                                                onChange={(e) => onDateChange('endDate', e.target.value)}
                                                min={filters.startDate}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-7 rounded border border-white/20 p-2">
                                    <svg viewBox="0 0 430 230" className="h-[180px] w-full sm:h-[214px]" preserveAspectRatio="none">
                                        <rect x="24" y="24" width="382" height="182" fill="none" stroke="rgba(255,255,255,0.28)" strokeDasharray="3 4" />
                                        {[1, 2, 3, 4].map((i) => (
                                            <line
                                                key={`h-${i}`}
                                                x1="24"
                                                y1={24 + i * 36}
                                                x2="406"
                                                y2={24 + i * 36}
                                                stroke="rgba(255,255,255,0.28)"
                                                strokeDasharray="3 4"
                                            />
                                        ))}
                                        {[1, 2, 3, 4, 5, 6].map((i) => (
                                            <line
                                                key={`v-${i}`}
                                                x1={24 + i * 54.5}
                                                y1="24"
                                                x2={24 + i * 54.5}
                                                y2="206"
                                                stroke="rgba(255,255,255,0.28)"
                                                strokeDasharray="3 4"
                                            />
                                        ))}

                                        {trendPath ? (
                                            <>
                                                <polyline fill="none" stroke="#f6ede8" strokeWidth="2.6" points={trendPath} />
                                                <polyline fill="none" stroke="#d0aca0" strokeWidth="2" points={trendShadowPath} />
                                            </>
                                        ) : null}

                                        <text x="6" y="208" fill="rgba(255,255,255,0.8)" fontSize="10">{formatCompactNumber(yAxisLabels[0])}</text>
                                        <text x="2" y="172" fill="rgba(255,255,255,0.8)" fontSize="10">{formatCompactNumber(yAxisLabels[1])}</text>
                                        <text x="2" y="136" fill="rgba(255,255,255,0.8)" fontSize="10">{formatCompactNumber(yAxisLabels[2])}</text>
                                        <text x="2" y="100" fill="rgba(255,255,255,0.8)" fontSize="10">{formatCompactNumber(yAxisLabels[3])}</text>
                                        <text x="2" y="64" fill="rgba(255,255,255,0.8)" fontSize="10">{formatCompactNumber(yAxisLabels[4])}</text>

                                        {monthLabels.slice(0, 7).map((label, index) => (
                                            <text
                                                key={`${label}-${index}`}
                                                x={24 + index * (382 / Math.max(monthLabels.slice(0, 7).length - 1, 1))}
                                                y="224"
                                                fill="rgba(255,255,255,0.8)"
                                                fontSize="10"
                                                textAnchor="middle"
                                            >
                                                {label}
                                            </text>
                                        ))}
                                    </svg>
                                </div>
                                <p className="mt-1 text-center text-base font-semibold sm:text-[20px]">Date</p>
                            </div>

                            <div className="relative rounded-[15px] border-t border-[#604f48] bg-[linear-gradient(135deg,#ece8d9,#e2dbc9_45%,#e9e3d5)] p-4 md:p-5 text-[#17120f] lg:rounded-l-none lg:border-t-0 lg:border-l">
                                <div className="grid h-full grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                                    <div className="space-y-4 xl:border-r xl:border-[#7a7068] xl:pr-5">
                                        <div>
                                            <span className="inline-block rounded-lg bg-black px-3 py-1 text-sm font-semibold leading-none text-white sm:text-base lg:text-[18px]">Growth</span>
                                            <p className="mt-3 text-xl font-semibold leading-tight sm:text-2xl lg:text-[28px]">{formatPercent(growth)} growth</p>
                                            <p className="mt-4 text-lg leading-tight sm:text-xl lg:text-[25px]">
                                                Peak Day:
                                                <br />
                                                Peak Orders:
                                                <br />
                                                Avg Order Value:
                                            </p>
                                        </div>

                                        <div>
                                            <span className="inline-block rounded-lg bg-black px-3 py-1 text-sm font-semibold leading-none text-white sm:text-base lg:text-[18px]">Fund Breakdown</span>
                                            <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-base leading-tight sm:gap-x-5 sm:text-lg lg:text-[24px]">
                                                <span>Total Sales</span>
                                                <span>{formatCurrency(report?.totals.totalSales || 0)}</span>
                                                <span>Total Orders</span>
                                                <span>{report?.totals.totalOrders || 0}</span>
                                                <span>Cancelled Orders</span>
                                                <span>{report?.totals.cancelledOrders || 0}</span>
                                                <span>Discount Loss</span>
                                                <span>-{formatCurrency(report?.totals.cancellationLoss || 0)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-[1fr_auto] text-lg font-semibold leading-tight sm:text-xl lg:text-[26px]">
                                            <span>Net Revenue</span>
                                            <span>{formatCurrency(report?.totals.netSales || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center text-xl font-semibold leading-tight sm:text-2xl lg:text-[30px]">
                                        <p>{peak ? new Date(peak.date).toLocaleDateString('en-US', { weekday: 'long' }) : '-'}</p>
                                        <p className="mt-2">{peakOrderDay?.orders || 0} orders</p>
                                        <p className="mt-2">{formatCurrency(report?.totals.averageOrderValue || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
