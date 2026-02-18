'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Branch } from '@/lib/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';

const branchSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    location: z.string().min(3, 'Location must be at least 3 characters'),
    tokenSystemEnabled: z.boolean(),
    tokenRangeStart: z.number().int().min(0).optional(),
    tokenRangeEnd: z.number().int().min(1).optional(),
}).refine((data) => {
    if (data.tokenSystemEnabled) {
        if (data.tokenRangeStart === undefined || data.tokenRangeEnd === undefined) {
            return false;
        }
        if (data.tokenRangeStart >= data.tokenRangeEnd) {
            return false;
        }
    }
    return true;
}, {
    message: "Token range start must be less than end, and both must be provided if token system is enabled",
    path: ["tokenRangeEnd"],
});

export type BranchFormData = z.infer<typeof branchSchema>;

interface BranchFormProps {
    initialData?: Branch;
    onSubmit: (data: BranchFormData) => Promise<void>;
    isLoading: boolean;
    isEdit?: boolean;
}

export default function BranchForm({ initialData, onSubmit, isLoading, isEdit = false }: BranchFormProps) {
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<BranchFormData>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            name: initialData?.name || '',
            location: initialData?.location || '',
            tokenSystemEnabled: initialData?.tokenSystemEnabled ?? initialData?.hasTokenSystem ?? false,
            tokenRangeStart: initialData?.tokenRangeStart ?? (initialData?.tokenSystemEnabled ? 1 : undefined),
            tokenRangeEnd: initialData?.tokenRangeEnd ?? initialData?.maxTokenNumber ?? 999,
        },
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const tokenSystemEnabled = watch('tokenSystemEnabled');

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <Input
                    label="Branch Name"
                    {...register('name')}
                    error={errors.name?.message}
                    placeholder="Downtown Cafe"
                />

                <Input
                    label="Location"
                    {...register('location')}
                    error={errors.location?.message}
                    placeholder="123 Main St, City"
                />

                <div className="pt-2">
                    <Checkbox
                        label="Enable Token System"
                        {...register('tokenSystemEnabled')}
                        id="tokenSystemEnabled"
                    />
                    <p className="mt-1 text-sm text-gray-500 ml-7">
                        If enabled, orders will be assigned a token number within the specified range.
                    </p>
                </div>

                {tokenSystemEnabled && (
                    <div className="ml-2 grid grid-cols-1 gap-4 border-l-2 border-gray-800 pl-7 sm:grid-cols-2">
                        <Input
                            label="Start Token"
                            type="number"
                            {...register('tokenRangeStart', { valueAsNumber: true })}
                            error={errors.tokenRangeStart?.message}
                        />
                        <Input
                            label="End Token"
                            type="number"
                            {...register('tokenRangeEnd', { valueAsNumber: true })}
                            error={errors.tokenRangeEnd?.message}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <Button type="submit" isLoading={isLoading} fullWidth>
                    {isEdit ? 'Update Branch' : 'Create Branch'}
                </Button>
            </div>
        </form>
    );
}
