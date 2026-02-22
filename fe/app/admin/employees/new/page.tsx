'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { employeeService } from '@/lib/api/employee-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import EmployeeForm, { EmployeeFormData } from '@/components/admin/EmployeeForm';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';

export default function NewEmployeePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    const handleSubmit = async (data: EmployeeFormData) => {
        try {
            setIsLoading(true);
            await employeeService.createEmployee({
                name: data.name,
                email: data.email,
                password: data.password!, // Validated in form to be present
                role: data.role,
                branchId: data.branchId || undefined,
            });

            setToast({
                message: 'Employee created successfully',
                type: 'success',
                isVisible: true,
            });

            // Redirect after short delay
            setTimeout(() => {
                router.push('/admin/employees');
            }, 1000);
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setToast({
                message: message || 'Failed to create employee',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

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
                    <h1 className="text-3xl font-bold text-black mb-2">Add Employee</h1>
                    <p className="text-black-400">Create a new staff member account</p>
                </div>
                <Link href="/admin/employees">
                    <Button >Back to List</Button>
                </Link>
            </div>

            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Employee Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmployeeForm onSubmit={handleSubmit} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    );
}
