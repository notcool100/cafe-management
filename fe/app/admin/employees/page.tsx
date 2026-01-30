'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { employeeService } from '@/lib/api/employee-service';
import { User } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setIsLoading(true);
            const data = await employeeService.getEmployees();
            setEmployees(data);
        } catch (error: unknown) {
            console.error('Failed to load employees:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await employeeService.deleteEmployee(id);
            setEmployees(employees.filter(emp => emp.id !== id));
            setDeleteConfirm(null);
        } catch (error: unknown) {
            console.error('Failed to delete employee:', error);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <span className="gradient-text">Employees</span>
                </h1>
                <p className="text-lg text-gray-400">Manage your cafe staff members</p>
            </div>

            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1">
                    <Input
                        type="text"
                        placeholder="🔍 Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <Link href="/admin/employees/new">
                    <Button>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Employee
                    </Button>
                </Link>
            </div>

            {/* Employees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((employee) => (
                    <Card key={employee.id} variant="glass" hover className="stagger-item overflow-hidden">
                        <CardContent className="p-0">
                            {/* Employee Header */}
                            <div className="p-6 pb-4 bg-gradient-to-br from-purple-600/10 via-transparent to-indigo-600/10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                            {employee.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate tracking-tight">
                                            {employee.name}
                                        </h3>
                                        <p className="text-sm text-gray-400 truncate">{employee.email}</p>
                                    </div>
                                </div>

                                {/* Role Badge */}
                                <div>
                                    <Badge variant={employee.role === 'ADMIN' ? 'info' : 'default'}>
                                        {employee.role === 'ADMIN' ? '👑 Admin' : '👤 Staff'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-5 flex gap-3 bg-white/[0.02] border-t border-white/10">
                                <Link href={`/admin/employees/${employee.id}`} className="flex-1">
                                    <Button size="sm" variant="outline" fullWidth>
                                        <EditIcon className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setDeleteConfirm(employee.id)}
                                    className="px-4"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredEmployees.length === 0 && (
                <Card variant="glass" className="animate-scale-in">
                    <CardContent className="py-16 text-center">
                        <div className="text-6xl mb-4">👥</div>
                        <p className="text-xl text-gray-300 mb-2 font-semibold">No employees found</p>
                        <p className="text-gray-500 mb-6">Get started by adding your first team member</p>
                        <Link href="/admin/employees/new">
                            <Button>
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Add First Employee
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Employee"
            >
                <p className="text-gray-300 mb-6 leading-relaxed">
                    Are you sure you want to delete this employee? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                    >
                        Delete Employee
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}

function EditIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}
