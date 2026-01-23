'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, UserRole, Branch } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useEffect, useState } from 'react';
import { branchService } from '@/lib/api/branch-service';

const employeeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().optional(),
    role: z.nativeEnum(UserRole),
    branchId: z.string().optional(),
}).refine((data) => {
    // Password is required for new employees (no ID check here, will be handled by parent)
    return true;
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
    initialData?: User;
    onSubmit: (data: EmployeeFormData) => Promise<void>;
    isLoading: boolean;
    isEdit?: boolean;
}

export default function EmployeeForm({ initialData, onSubmit, isLoading, isEdit = false }: EmployeeFormProps) {
    const [branches, setBranches] = useState<Branch[]>([]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
    } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            name: initialData?.name || '',
            email: initialData?.email || '',
            role: initialData?.role || UserRole.EMPLOYEE,
            branchId: initialData?.branchId || '',
            password: '',
        },
    });

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await branchService.getBranches();
                setBranches(data);
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        };
        loadBranches();
    }, []);

    const handleFormSubmit = async (data: EmployeeFormData) => {
        if (!isEdit && !data.password) {
            setError('password', {
                type: 'manual',
                message: 'Password is required for new employees',
            });
            return;
        }
        await onSubmit(data);
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="space-y-4">
                <Input
                    label="Full Name"
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="John Doe"
                />

                <Input
                    label="Email Address"
                    type="email"
                    {...register('email')}
                    error={errors.email?.message}
                    placeholder="john@example.com"
                />

                {!isEdit && (
                    <Input
                        label="Password"
                        type="password"
                        {...register('password')}
                        error={errors.password?.message}
                        placeholder="••••••••"
                        helperText="At least 6 characters"
                    />
                )}

                <Select
                    label="Role"
                    {...register('role')}
                    error={errors.role?.message}
                    options={[
                        { value: UserRole.EMPLOYEE, label: 'Employee' },
                        { value: UserRole.STAFF, label: 'Staff' },
                        { value: UserRole.ADMIN, label: 'Admin' },
                    ]}
                />

                <Select
                    label="Branch (Optional)"
                    {...register('branchId')}
                    error={errors.branchId?.message}
                    options={[
                        { value: '', label: 'No Branch Assigned' },
                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                />
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Employee' : 'Create Employee'}
                </Button>
            </div>
        </form>
    );
}
