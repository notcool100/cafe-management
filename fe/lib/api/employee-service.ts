import apiClient from './api-client';
import { User, RegisterData } from '../types';

export const employeeService = {
    async getEmployees(): Promise<User[]> {
        const response = await apiClient.get<User[]>('/admin/employees');
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
