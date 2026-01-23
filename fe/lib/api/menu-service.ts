import apiClient from './api-client';
import { MenuItem, CreateMenuItemData, MenuFilters } from '../types';

const buildMenuItemFormData = (data: Partial<CreateMenuItemData>) => {
    const formData = new FormData();

    if (data.name !== undefined) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.price !== undefined) formData.append('price', String(data.price));
    if (data.category !== undefined) formData.append('category', data.category);
    if (data.branchId !== undefined) formData.append('branchId', data.branchId);
    if (data.available !== undefined) formData.append('isAvailable', String(data.available));
    if (data.imageFile) formData.append('image', data.imageFile);

    return formData;
};

export const menuService = {
    async getMenuItems(filters?: MenuFilters): Promise<MenuItem[]> {
        const params = new URLSearchParams();

        if (filters?.branchId) params.append('branchId', filters.branchId);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.available !== undefined) params.append('available', String(filters.available));

        const response = await apiClient.get<MenuItem[]>(`/menu/items?${params.toString()}`);
        return response.data;
    },

    async getMenuItem(id: string): Promise<MenuItem> {
        const response = await apiClient.get<MenuItem>(`/menu/items/${id}`);
        return response.data;
    },

    async createMenuItem(data: CreateMenuItemData): Promise<MenuItem> {
        const response = await apiClient.post<MenuItem>('/menu/items', buildMenuItemFormData(data), {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    async updateMenuItem(id: string, data: Partial<CreateMenuItemData>): Promise<MenuItem> {
        const response = await apiClient.put<MenuItem>(
            `/menu/items/${id}`,
            buildMenuItemFormData(data),
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return response.data;
    },

    async deleteMenuItem(id: string): Promise<void> {
        await apiClient.delete(`/menu/items/${id}`);
    },

    // Public endpoint for customer menu browsing
    async getPublicMenu(branchId: string): Promise<MenuItem[]> {
        const response = await apiClient.get<MenuItem[]>(`/menu/${branchId}`);
        return response.data;
    },
};
