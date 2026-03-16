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
import { useAuthStore } from '@/lib/store/auth-store';
import { formatBranchLabel } from '@/lib/utils/format';

const employeeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().optional(),
    role: z.nativeEnum(UserRole),
    branchIds: z.array(z.string()).optional(),
    branchId: z.string().optional(), // Legacy for single branch roles
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
    const { user } = useAuthStore();
    const isManager = user?.role === UserRole.MANAGER;

    const {
        register,
        handleSubmit,
        formState: { errors },
        setError,
        setValue,
        reset,
        watch,
    } = useForm<EmployeeFormData>({
        resolver: zodResolver(employeeSchema),
        defaultValues: {
            name: initialData?.name || '',
            email: initialData?.email || '',
            role: initialData?.role || UserRole.EMPLOYEE,
            branchIds: initialData?.branchIds || [],
            branchId: initialData?.branchIds?.[0] || '',
            password: '',
        },
    });

    const selectedRole = watch('role');

    useEffect(() => {
        reset({
            name: initialData?.name || '',
            email: initialData?.email || '',
            role: initialData?.role || UserRole.EMPLOYEE,
            branchIds: initialData?.branchIds || [],
            branchId: initialData?.branchIds?.[0] || '',
            password: '',
        });
    }, [initialData, reset]);

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

        // Handle the mismatch between single branchId and multiple branchIds
        const finalData = {
            ...data,
            branchIds: data.role === UserRole.MANAGER ? data.branchIds : (data.branchId ? [data.branchId] : []),
        };

        await onSubmit(finalData as any);
    };

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="space-y-6 text-[#1f1c17] [&_label]:!text-[#1f1c17] [&_input]:!text-[#1f1c17] [&_input]:!bg-white [&_input]:!border-[#9ca3af] [&_select]:!text-[#1f1c17] [&_select]:!bg-white [&_select]:!border-[#9ca3af] [&_option]:!text-[#1f1c17] [&_option]:!bg-white [&_button[type='button']]:!text-[#1f1c17] [&_p.text-sm.text-gray-500]:!text-[#1f1c17]"
        >
            <div className="space-y-4">
                <Input
                    label="Full Name"
                    floatingLabel={false}
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="John Doe"
                />

                <Input
                    label="Email Address"
                    type="email"
                    floatingLabel={false}
                    {...register('email')}
                    error={errors.email?.message}
                    placeholder="john@example.com"
                />

                {!isEdit && (
                    <Input
                        label="Password"
                        type="password"
                        floatingLabel={false}
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
                        { value: UserRole.MANAGER, label: 'Manager' },
                        { value: UserRole.ADMIN, label: 'Admin' },
                    ]}
                />

                {selectedRole === UserRole.MANAGER ? (
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-[#1f1c17]">Assigned Branches</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 border rounded-lg bg-gray-50">
                            {branches.map((branch) => (
                                <label key={branch.id} className="flex items-center space-x-2 text-sm">
                                    <input
                                        type="checkbox"
                                        value={branch.id}
                                        {...register('branchIds')}
                                        className="rounded border-gray-300 text-brown-600 focus:ring-brown-500"
                                    />
                                    <span>{formatBranchLabel(branch)}</span>
                                </label>
                            ))}
                        </div>
                        {errors.branchIds?.message && (
                            <p className="text-xs text-red-500 mt-1">{errors.branchIds.message}</p>
                        )}
                    </div>
                ) : (
                    <Select
                        label="Branch (Optional)"
                        {...register('branchId')}
                        error={errors.branchId?.message}
                        options={[
                            { value: '', label: 'No Branch Assigned' },
                            ...branches.map((b) => ({ value: b.id, label: formatBranchLabel(b) })),
                        ]}
                    />
                )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Employee' : 'Create Employee'}
                </Button>
            </div>
        </form>
    );
}
