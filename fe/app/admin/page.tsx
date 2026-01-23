'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { employeeService } from '@/lib/api/employee-service';
import { branchService } from '@/lib/api/branch-service';
import { menuService } from '@/lib/api/menu-service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState({
        employees: 0,
        branches: 0,
        menuItems: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setIsLoading(true);
            const [employees, branches, menuItems] = await Promise.all([
                employeeService.getEmployees(),
                branchService.getBranches(),
                menuService.getMenuItems({}),
            ]);

            setStats({
                employees: employees.length,
                branches: branches.length,
                menuItems: menuItems.length,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Enhanced Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                    <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-lg text-gray-400">Welcome to the cafe management admin panel</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <Card variant="glass" hover className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-2">Total Employees</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    {stats.employees}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30">
                                <UsersIcon className="h-8 w-8 text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass" hover className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-2">Total Branches</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                                    {stats.branches}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/30">
                                <BuildingIcon className="h-8 w-8 text-indigo-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card variant="glass" hover className="overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-400 mb-2">Menu Items</p>
                                <p className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                                    {stats.menuItems}
                                </p>
                            </div>
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
                                <MenuIcon className="h-8 w-8 text-cyan-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Link
                        href="/admin/employees/new"
                        className="group"
                    >
                        <Card variant="glass" hover className="h-full">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-200 border border-purple-500/30">
                                        <PlusIcon className="h-7 w-7 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Add Employee</h3>
                                        <p className="text-sm text-gray-500">Create a new staff member</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link
                        href="/admin/branches/new"
                        className="group"
                    >
                        <Card variant="glass" hover className="h-full">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center group-hover:from-indigo-500/30 group-hover:to-blue-500/30 transition-all duration-200 border border-indigo-500/30">
                                        <PlusIcon className="h-7 w-7 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Add Branch</h3>
                                        <p className="text-sm text-gray-500">Create a new branch location</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link
                        href="/admin/menu/new"
                        className="group"
                    >
                        <Card variant="glass" hover className="h-full">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-200 border border-cyan-500/30">
                                        <PlusIcon className="h-7 w-7 text-cyan-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white mb-1">Add Menu Item</h3>
                                        <p className="text-sm text-gray-500">Create a new menu item</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    );
}

// Icons
function UsersIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}

function BuildingIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
    );
}
