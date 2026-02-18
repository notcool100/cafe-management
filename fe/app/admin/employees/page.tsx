'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { employeeService } from '@/lib/api/employee-service';
import { User } from '@/lib/types';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

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
            setToast({
                message: 'Failed to load employees',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await employeeService.deleteEmployee(id);
            setEmployees(employees.filter((emp) => emp.id !== id));
            setDeleteConfirm(null);
            setToast({
                message: 'Employee deleted successfully',
                type: 'success',
                isVisible: true,
            });
        } catch (error: unknown) {
            console.error('Failed to delete employee:', error);
            setToast({
                message: 'Failed to delete employee',
                type: 'error',
                isVisible: true,
            });
        }
    };

    const filteredEmployees = employees.filter(
        (emp) =>
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="min-h-[70vh] bg-[#efe8cf] px-4 py-6">
                <div className="mx-auto max-w-7xl rounded-md border border-[#e3dcc4] bg-[#efe8cf] p-5">
                    <div className="flex h-64 items-center justify-center">
                        <Spinner size="lg" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[70vh] bg-[#efe8cf] px-4 py-6">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mx-auto max-w-7xl rounded-md border border-[#e3dcc4] bg-[#efe8cf] p-3 sm:p-5">
                <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="text-xl font-semibold leading-tight text-[#1f1c17]">Dashboard</p>
                        <h1 className="mt-2 text-3xl font-bold leading-tight text-[#15120f]">Select an Employee</h1>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                        <div className="min-w-[240px]">
                            <Input
                                type="text"
                                placeholder="Search employee..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <Link href="/admin/employees/new">
                            <Button className="bg-gradient-to-r from-[#7d5bff] to-[#3d84f6] text-[#f7f3e6] shadow-[0_10px_24px_rgba(73,94,213,0.35)] hover:from-[#6f4ef0] hover:to-[#2f78ea]">
                                <PlusIcon className="mr-2 h-5 w-5" />
                                Add Employee
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEmployees.map((employee) => (
                        <div
                            key={employee.id}
                            className="rounded-lg bg-[#643427] p-4 shadow-[0_1px_6px_rgba(0,0,0,0.22)]"
                        >
                            <Link href={`/admin/employees/${employee.id}`} className="block">
                                <div className="mb-4 rounded-md bg-[#f4f3ef] p-6 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#6a4135] text-xl font-bold text-[#f3e7d2]">
                                            {employee.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-lg font-semibold text-[#1d1a16]">{employee.name}</p>
                                            <p className="truncate text-sm text-[#50453d]">{employee.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>

                            <p className="truncate px-1 text-2xl font-semibold text-[#f1e8d6]">{employee.role}</p>
                            <div className="mt-2 px-1">
                                <Badge variant={employee.role === 'ADMIN' ? 'info' : 'default'}>
                                    {employee.role === 'ADMIN' ? 'Admin' : employee.role === 'MANAGER' ? 'Manager' : 'Staff'}
                                </Badge>
                            </div>

                            <div className="mt-4 flex gap-2">
                                <Link href={`/admin/employees/${employee.id}`} className="flex-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full border-[#b57cff] text-[#f1e8d6] hover:bg-[#73463a]"
                                    >
                                        <EditIcon className="mr-1.5 h-4 w-4" />
                                        Edit
                                    </Button>
                                </Link>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => setDeleteConfirm(employee.id)}
                                    className="px-3"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredEmployees.length === 0 && (
                    <div className="rounded-lg border border-[#d4c9ab] bg-[#f3ebd2] py-16 text-center">
                        <p className="text-2xl font-semibold text-[#2a241d]">No employees found</p>
                        <p className="mt-2 text-[#56473a]">Create your first employee to get started.</p>
                        <Link href="/admin/employees/new">
                            <Button className="mt-6 bg-gradient-to-r from-[#7d5bff] to-[#3d84f6] text-[#f7f3e6] hover:from-[#6f4ef0] hover:to-[#2f78ea]">
                                <PlusIcon className="mr-2 h-5 w-5" />
                                Add Employee
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <Modal isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="Delete Employee">
                <p className="mb-6 leading-relaxed text-gray-300">
                    Are you sure you want to delete this employee? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
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
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
        </svg>
    );
}
