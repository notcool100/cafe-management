import apiClient from './api-client';
import { User, RegisterData } from '../types';

export const employeeService = {
    async getEmployees(branchId?: string): Promise<User[]> {
        const params = new URLSearchParams();
        if (branchId) {
            params.append('branchId', branchId);
        }

        const endpoint = params.size > 0 ? `/admin/employees?${params.toString()}` : '/admin/employees';
        const response = await apiClient.get<User[]>(endpoint);
        return response.data;
    },

    async getEmployee(id: string): Promise<User> {
        const response = await apiClient.get<User>(`/admin/employees/${id}`);
        return response.data;
    },

    async createEmployee(data: RegisterData): Promise<User> {
        const response = await apiClient.post<User>('/admin/employees', data);
        return response.data;
    },

    async updateEmployee(id: string, data: Partial<RegisterData>): Promise<User> {
        const response = await apiClient.put<User>(`/admin/employees/${id}`, data);
        return response.data;
    },

    async deleteEmployee(id: string): Promise<void> {
        await apiClient.delete(`/admin/employees/${id}`);
    },
};
