'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { employeeService } from '@/lib/api/employee-service';
import { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import EmployeeForm, { EmployeeFormData } from '@/components/admin/EmployeeForm';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import Spinner from '@/components/ui/Spinner';

export default function EditEmployeePage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [employee, setEmployee] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const loadEmployee = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await employeeService.getEmployee(id);
            setEmployee(data);
        } catch {
            setToast({
                message: 'Failed to load employee details',
                type: 'error',
                isVisible: true,
            });
            // Redirect back if not found
            setTimeout(() => {
                router.push('/admin/employees');
            }, 2000);
        } finally {
            setIsLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        loadEmployee();
    }, [loadEmployee]);

    const handleSubmit = async (data: EmployeeFormData) => {
        try {
            setIsSaving(true);
            await employeeService.updateEmployee(id, {
                name: data.name,
                email: data.email,
                role: data.role,
                branchId: data.branchId || undefined,
                // Only send password if it's provided (optional in update)
                ...(data.password ? { password: data.password } : {}),
            });

            setToast({
                message: 'Employee updated successfully',
                type: 'success',
                isVisible: true,
            });

            setTimeout(() => {
                router.push('/admin/employees');
            }, 1000);
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to update employee',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!employee) return null;

    return (
        <div className="max-w-2xl mx-auto">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Edit Employee</h1>
                    <p className="text-gray-400">Update staff member details</p>
                </div>
                <Link href="/admin/employees">
                    <Button variant="ghost">Back to List</Button>
                </Link>
            </div>

            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Employee Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmployeeForm
                        initialData={employee}
                        onSubmit={handleSubmit}
                        isLoading={isSaving}
                        isEdit={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
