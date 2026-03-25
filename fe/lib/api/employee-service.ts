import apiClient from './api-client';
import { User, RegisterData } from '../types';

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set<string>();

    return items.filter((item) => {
        if (!item.id || seen.has(item.id)) {
            return false;
        }

        seen.add(item.id);
        return true;
    });
};

const buildEmployeeFormData = (data: Partial<RegisterData> & { branchId?: string }) => {
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.email !== undefined) formData.append('email', data.email);
    if (data.password !== undefined) formData.append('password', data.password);
    if (data.role !== undefined) formData.append('role', data.role);
    if (data.branchId !== undefined) formData.append('branchId', data.branchId);
    if (data.tenantId !== undefined) formData.append('tenantId', data.tenantId);
    if (data.branchIds !== undefined) {
        data.branchIds.forEach((branchId) => formData.append('branchIds', branchId));
    }
    if (data.imageFile) formData.append('image', data.imageFile);

    return formData;
};

export const employeeService = {
    async getEmployees(branchId?: string): Promise<User[]> {
        const params = new URLSearchParams();
        if (branchId) {
            params.append('branchId', branchId);
        }

        const endpoint = params.size > 0 ? `/admin/employees?${params.toString()}` : '/admin/employees';
        const response = await apiClient.get<User[]>(endpoint);
        return dedupeById(response.data);
    },

    async getEmployee(id: string): Promise<User> {
        const response = await apiClient.get<User>(`/admin/employees/${id}`);
        return response.data;
    },

    async createEmployee(data: RegisterData): Promise<User> {
        const response = await apiClient.post<User>('/admin/employees', buildEmployeeFormData(data), {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    async updateEmployee(id: string, data: Partial<RegisterData>): Promise<User> {
        const response = await apiClient.put<User>(
            `/admin/employees/${id}`,
            buildEmployeeFormData(data),
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    async deleteEmployee(id: string): Promise<void> {
        await apiClient.delete(`/admin/employees/${id}`);
    },
};
