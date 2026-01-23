'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { branchService } from '@/lib/api/branch-service';
import { reportService } from '@/lib/api/report-service';
import { Branch, OrderStatus, ReportOverview, UserRole } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import Badge from '@/components/ui/Badge';
import { useAuthStore } from '@/lib/store/auth-store';

const toInputDate = (date: Date) => date.toISOString().split('T')[0];
const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value || 0);

const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function ReportsPage() {
    const { user } = useAuthStore();
    const isStaffManager = user?.role === UserRole.MANAGER;
    const [branches, setBranches] = useState<Branch[]>([]);
    const [report, setReport] = useState<ReportOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasLoadedOnceRef = useRef(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false,
    });
    const [selectedBranchForTop, setSelectedBranchForTop] = useState<string | null>(null);
    const [filters, setFilters] = useState(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 29);

        return {
            branchId: isStaffManager && user?.branchId ? user.branchId : 'all',
            startDate: toInputDate(start),
            endDate: toInputDate(end),
        };
    });

    const loadBranches = useCallback(async () => {
        try {
            if (isStaffManager && user?.branchId) {
                setFilters((prev) => ({ ...prev, branchId: user.branchId! }));

                if (user.branch) {
                    const branchSource = user.branch as Branch & {
                        hasTokenSystem?: boolean;
                        maxTokenNumber?: number;
                    };

                    const staffBranch: Branch = {
                        ...branchSource,
                        tokenSystemEnabled: branchSource.tokenSystemEnabled ?? Boolean(branchSource.hasTokenSystem),
                        tokenRangeEnd: branchSource.tokenRangeEnd ?? branchSource.maxTokenNumber,
                    };
                    setBranches([staffBranch]);
                }
                return;
            }

            const data = await branchService.getBranches();
            setBranches(data);
        } catch {
            setToast({
                message: 'Unable to load branches for filtering',
                type: 'error',
                isVisible: true,
            });
        }
    }, [isStaffManager, user?.branch, user?.branchId]);

    const fetchReport = useCallback(async () => {
        if (new Date(filters.startDate) > new Date(filters.endDate)) {
            setToast({
                message: 'Start date must be before end date',
                type: 'error',
                isVisible: true,
            });
            return;
        }

        const isFirstLoad = !hasLoadedOnceRef.current;
        if (isFirstLoad) {
            setIsLoading(true);
        } else {
            setIsRefreshing(true);
        }

        try {
            const data = await reportService.getOverview({
                branchId: filters.branchId !== 'all' ? filters.branchId : undefined,
                startDate: filters.startDate,
                endDate: filters.endDate,
            });
            setReport(data);
            hasLoadedOnceRef.current = true;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to load report data';
            setToast({
                message,
                type: 'error',
                isVisible: true,
            });
        } finally {
            if (isFirstLoad) {
                setIsLoading(false);
            } else {
                setIsRefreshing(false);
            }
        }
    }, [filters.branchId, filters.endDate, filters.startDate]);

    useEffect(() => {
        void loadBranches();
    }, [loadBranches]);

    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    useEffect(() => {
        if (!report || !report.branchTopItems?.length) {
            setSelectedBranchForTop(null);
            return;
        }

        const preferred =
            filters.branchId !== 'all' ? filters.branchId : report.branchTopItems[0]?.branchId;
        const hasPreferred = report.branchTopItems.some((b) => b.branchId === preferred);

        setSelectedBranchForTop(hasPreferred ? preferred : report.branchTopItems[0].branchId);
    }, [filters.branchId, report]);

    const statusMeta: Record<OrderStatus, { label: string; color: string; bar: string }> = {
        [OrderStatus.PENDING]: { label: 'Pending', color: 'text-amber-300', bar: 'from-amber-500/30 to-amber-300/50' },
        [OrderStatus.PREPARING]: { label: 'Preparing', color: 'text-blue-300', bar: 'from-blue-500/30 to-blue-300/50' },
        [OrderStatus.READY]: { label: 'Ready', color: 'text-cyan-300', bar: 'from-cyan-500/30 to-cyan-300/50' },
        [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-emerald-300', bar: 'from-emerald-500/40 to-green-300/60' },
        [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-rose-300', bar: 'from-rose-500/30 to-rose-300/50' },
        [OrderStatus.CANCELLATION_PENDING]: { label: 'Cancellation Pending', color: 'text-amber-200', bar: 'from-amber-500/40 to-amber-300/60' },
    };

    const branchOptions = [
        ...(isStaffManager && user?.branchId
            ? [{
                value: user.branchId,
                label: user.branch?.name || 'My Branch',
            }]
            : [{ value: 'all', label: 'All branches' }, ...branches.map((branch) => ({ value: branch.id, label: branch.name }))]),
    ];

    const totalOrders = report?.totals.totalOrders || 0;
    const maxTrendValue =
        report?.dailyTrend?.reduce((max, point) => (point.sales > max ? point.sales : max), 0) || 0;

    return (
        <div className="animate-fade-in">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
                        <span className="gradient-text">Reports & Insights</span>
                    </h1>
                    <p className="text-gray-400">
                        Track sales momentum, spot losses, and compare branches in one place.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="default">
                        {filters.branchId === 'all'
                            ? 'All branches'
                            : branches.find((b) => b.id === filters.branchId)?.name || user?.branch?.name || 'Branch'}
                    </Badge>
                    <Badge variant="info">
                        {formatShortDate(filters.startDate)} - {formatShortDate(filters.endDate)}
                    </Badge>
                </div>
            </div>

            <Card variant="glass" className="mb-8">
                <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                        <div className="w-full md:w-1/3">
                            <Select
                                label="Branch"
                                value={filters.branchId}
                                onChange={(e) => setFilters((prev) => ({ ...prev, branchId: e.target.value }))}
                                options={branchOptions}
                                disabled={user?.role === UserRole.MANAGER}
                            />
                            {user?.role === UserRole.MANAGER && (
                                <p className="mt-1 text-xs text-amber-300">
                                    You are seeing data for your assigned branch.
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                            <Input
                                label="Start date"
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                            />
                            <Input
                                label="End date"
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={fetchReport} disabled={isRefreshing}>
                                {isRefreshing ? <Spinner size="sm" /> : 'Refresh'}
                            </Button>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Reports refresh automatically when filters change. Default window shows the last 30 days.
                    </p>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Spinner size="lg" />
                </div>
            ) : !report ? (
                <Card variant="glass">
                    <CardContent className="py-16 text-center">
                        <p className="text-gray-300">No report data available.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <MetricCard
                            title="Gross Sales"
                            value={formatCurrency(report.totals.totalSales)}
                            accent="from-purple-500 to-pink-500"
                            sub={`${report.totals.completedOrders} completed orders`}
                        />
                        <MetricCard
                            title="Net Sales"
                            value={formatCurrency(report.totals.netSales)}
                            accent="from-indigo-500 to-blue-500"
                            sub={`-${formatCurrency(report.totals.cancellationLoss)} lost to cancellations`}
                        />
                        <MetricCard
                            title="Orders Volume"
                            value={report.totals.totalOrders.toLocaleString()}
                            accent="from-emerald-500 to-teal-500"
                            sub={`${report.totals.cancelledOrders} cancelled • ${report.totals.completedOrders} fulfilled`}
                        />
                        <MetricCard
                            title="Avg Ticket"
                            value={formatCurrency(report.totals.averageOrderValue)}
                            accent="from-orange-500 to-amber-400"
                            sub="Based on completed orders"
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <Card variant="glass" className="xl:col-span-1">
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle>Order Status Mix</CardTitle>
                                <Badge variant="info">Total {totalOrders}</Badge>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.values(OrderStatus).map((status) => {
                                    const count = report.statusBreakdown[status] || 0;
                                    const percent = totalOrders ? Math.round((count / totalOrders) * 100) : 0;
                                    const meta = statusMeta[status] || {
                                        label: status,
                                        color: 'text-gray-300',
                                        bar: 'from-gray-600/40 to-gray-500/60',
                                    };

                                    return (
                                        <div key={status} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className={`font-medium ${meta.color}`}>{meta.label}</span>
                                                <span className="text-gray-300 font-semibold">
                                                    {count} ({percent}%)
                                                </span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                                                <div
                                                    className={`h-full bg-gradient-to-r ${meta.bar}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        <Card variant="glass" className="xl:col-span-2">
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle>Daily Sales Trend</CardTitle>
                            <Badge variant="info">
                                Peak {formatCurrency(maxTrendValue)}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            {report.dailyTrend.length === 0 ? (
                                <div className="h-40 flex items-center justify-center text-sm text-gray-500">
                                    No completed sales in this window.
                                </div>
                            ) : (
                                <div className="h-40 flex items-end gap-2">
                                    {report.dailyTrend.map((point) => {
                                        const height = maxTrendValue
                                            ? Math.max((point.sales / maxTrendValue) * 100, 4)
                                            : 0;

                                        return (
                                            <div key={point.date} className="flex-1 flex flex-col items-center group">
                                                <div
                                                    className="w-full rounded-t-xl bg-gradient-to-t from-purple-600/70 via-indigo-500/70 to-blue-400/70 shadow-lg shadow-purple-500/20 transition-all duration-150 group-hover:brightness-110"
                                                    style={{ height: `${height}%` }}
                                                />
                                                <span className="mt-2 text-[10px] text-gray-500">
                                                    {formatShortDate(point.date)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="mt-3 text-sm text-gray-400">
                                Net change: {formatCurrency(report.dailyTrend[report.dailyTrend.length - 1]?.sales || 0)} today
                            </div>
                        </CardContent>
                    </Card>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <Card variant="glass" className="xl:col-span-2">
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle>Branch Performance</CardTitle>
                                <Badge variant="info">
                                    {report.branchBreakdown.length} active branch{report.branchBreakdown.length === 1 ? '' : 'es'}
                                </Badge>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-800">
                                            <th className="py-3 text-left font-medium">Branch</th>
                                            <th className="py-3 text-right font-medium">Sales</th>
                                            <th className="py-3 text-right font-medium">Net</th>
                                            <th className="py-3 text-right font-medium">Orders</th>
                                            <th className="py-3 text-right font-medium">Avg Ticket</th>
                                            <th className="py-3 text-right font-medium">Loss</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.branchBreakdown.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-4 text-center text-gray-500">
                                                    No branch data in this range.
                                                </td>
                                            </tr>
                                        )}
                                        {report.branchBreakdown.map((branch) => {
                                            const share = report.totals.totalSales
                                                ? Math.round((branch.totalSales / report.totals.totalSales) * 100)
                                                : 0;

                                            return (
                                                <tr key={branch.branchId} className="border-b border-gray-900/60 hover:bg-white/5 transition-colors">
                                                    <td className="py-3 pr-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-semibold">
                                                                {branch.branchName}
                                                            </span>
                                                            <span className="text-xs text-gray-500">{branch.location}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right text-gray-100">
                                                        {formatCurrency(branch.totalSales)}
                                                        <span className="block text-xs text-gray-500">{share}% of total</span>
                                                    </td>
                                                    <td className="py-3 text-right text-emerald-300 font-semibold">
                                                        {formatCurrency(branch.netSales)}
                                                    </td>
                                                    <td className="py-3 text-right text-gray-100">
                                                        {branch.totalOrders}
                                                        <span className="block text-xs text-gray-500">
                                                            {branch.cancelledOrders} cancelled
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right text-gray-100">
                                                        {formatCurrency(branch.averageOrderValue)}
                                                    </td>
                                                    <td className="py-3 text-right text-rose-300">
                                                        {formatCurrency(branch.cancellationLoss)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        <Card variant="glass" className="xl:col-span-1">
                            <CardHeader>
                                <CardTitle>Overall Top Sellers</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {report.topItems.length === 0 && (
                                    <div className="text-sm text-gray-500">No items sold in this range.</div>
                                )}
                                {report.topItems.map((item, index) => {
                                    const share = report.totals.totalSales
                                        ? ((item.revenue / report.totals.totalSales) * 100).toFixed(1)
                                        : '0.0';

                                    return (
                                        <div key={item.menuItemId} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/10">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-indigo-500/30 flex items-center justify-center text-white font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="text-white font-semibold">{item.name}</p>
                                                    <p className="text-xs text-gray-500">{item.quantity} sold</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-white font-semibold">{formatCurrency(item.revenue)}</p>
                                                <p className="text-xs text-gray-500">{share}% of sales</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <Card variant="glass" className="xl:col-span-1">
                            <CardHeader className="flex items-center justify-between">
                                <CardTitle>Top Sellers by Branch</CardTitle>
                                <Badge variant="info">
                                    {report.branchTopItems.length} branch{report.branchTopItems.length === 1 ? '' : 'es'}
                                </Badge>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Select
                                    value={selectedBranchForTop || ''}
                                    onChange={(e) => setSelectedBranchForTop(e.target.value)}
                                    options={
                                        report.branchTopItems.map((branch) => ({
                                            value: branch.branchId,
                                            label: branch.branchName || 'Branch',
                                        }))
                                    }
                                    className="bg-gray-900"
                                />
                                {(!report.branchTopItems.length || !selectedBranchForTop) && (
                                    <div className="text-sm text-gray-500">No branch-level sales in this range.</div>
                                )}
                                {selectedBranchForTop && (
                                    <BranchTopList
                                        branch={report.branchTopItems.find((b) => b.branchId === selectedBranchForTop)}
                                        totalSales={report.branchBreakdown.find((b) => b.branchId === selectedBranchForTop)?.totalSales || 0}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({
    title,
    value,
    sub,
    accent = 'from-purple-500 to-indigo-500',
}: {
    title: string;
    value: string;
    sub?: string;
    accent?: string;
}) {
    return (
        <Card variant="glass" hover>
            <CardContent className="space-y-3">
                <p className="text-sm text-gray-400">{title}</p>
                <div className={`text-3xl font-bold bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
                    {value}
                </div>
                {sub && <p className="text-xs text-gray-500">{sub}</p>}
            </CardContent>
        </Card>
    );
}

function BranchTopList({
    branch,
    totalSales,
}: {
    branch?: { branchId: string; branchName: string; items: { menuItemId: string; name: string; quantity: number; revenue: number; }[] };
    totalSales: number;
}) {
    if (!branch || branch.items.length === 0) {
        return <div className="text-sm text-gray-500">No items sold for this branch in this range.</div>;
    }

    return (
        <div className="space-y-3">
            {branch.items.map((item, index) => {
                const share = totalSales ? ((item.revenue / totalSales) * 100).toFixed(1) : '0.0';
                return (
                    <div key={item.menuItemId} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-cyan-500/30 flex items-center justify-center text-white font-semibold">
                                {index + 1}
                            </div>
                            <div>
                                <p className="text-white font-semibold">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.quantity} sold</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-white font-semibold">{formatCurrency(item.revenue)}</p>
                            <p className="text-xs text-gray-500">{share}% of branch sales</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
