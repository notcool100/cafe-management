import apiClient from './api-client';
import { Category, CreateCategoryData } from '../types';

const normalizeCategory = (category: Partial<Category> & { sharedBranchIds?: string[] }) => {
    const sharedBranchIds = Array.isArray(category.sharedBranchIds) ? category.sharedBranchIds : [];

    return {
        ...category,
        sharedBranchIds,
    } as Category;
};

export const categoryService = {
    async getCategories(branchId?: string): Promise<Category[]> {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        const response = await apiClient.get<Category[]>(`/menu/categories?${params.toString()}`);
        return response.data.map(normalizeCategory);
    },

    async getCategory(id: string): Promise<Category> {
        const response = await apiClient.get<Category>(`/menu/categories/${id}`);
        return normalizeCategory(response.data);
    },

    async createCategory(data: CreateCategoryData): Promise<Category> {
        const response = await apiClient.post<Category>('/menu/categories', data);
        return normalizeCategory(response.data);
    },

    async updateCategory(id: string, data: Partial<CreateCategoryData>): Promise<Category> {
        const response = await apiClient.put<Category>(`/menu/categories/${id}`, data);
        return normalizeCategory(response.data);
    },

    async deleteCategory(id: string): Promise<void> {
        await apiClient.delete(`/menu/categories/${id}`);
    },
};
