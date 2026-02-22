import { z } from 'zod';
import { UserRole } from '../types';

// Auth Schemas
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.nativeEnum(UserRole),
});

// Employee Schemas
export const employeeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.nativeEnum(UserRole),
});

export const updateEmployeeSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    role: z.nativeEnum(UserRole).optional(),
});

// Branch Schemas
export const branchSchema = z.object({
    name: z.string().min(2, 'Branch name must be at least 2 characters'),
    location: z.string().min(5, 'Location must be at least 5 characters'),
    tokenSystemEnabled: z.boolean().default(false),
    tokenRangeStart: z.number().int().min(1).optional(),
    tokenRangeEnd: z.number().int().min(1).optional(),
}).refine((data) => {
    if (data.tokenSystemEnabled) {
        return data.tokenRangeStart && data.tokenRangeEnd && data.tokenRangeStart < data.tokenRangeEnd;
    }
    return true;
}, {
    message: 'Token range end must be greater than start when token system is enabled',
    path: ['tokenRangeEnd'],
});

// Menu Item Schemas
export const menuItemSchema = z.object({
    name: z.string().min(2, 'Item name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be a positive number'),
    category: z.string().min(1, 'Category is required'),
    available: z.boolean().default(true),
    branchId: z.string().min(1, 'Branch is required'),
});

// Order Schemas
export const orderSchema = z.object({
    branchId: z.string().min(1, 'Branch is required'),
    customerName: z.string().min(2).optional(),
    customerPhone: z.string().optional(),
    items: z.array(
        z.object({
            menuItemId: z.string().min(1),
            quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        })
    ).min(1, 'At least one item is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type BranchFormData = z.infer<typeof branchSchema>;
export type MenuItemFormData = z.infer<typeof menuItemSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
