import apiClient from './api-client';
import { Branch, MenuItem, CreateMenuItemData, MenuFilters } from '../types';

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

const normalizeMenuItem = (
    item: Partial<MenuItem> & { isAvailable?: boolean; price?: number | string }
): MenuItem => {
    const normalizedPrice = typeof item.price === 'number' ? item.price : Number(item.price ?? 0);
    const availableFlag = item.available ?? item.isAvailable ?? false;

    return {
        ...item,
        price: normalizedPrice,
        available: availableFlag,
    } as MenuItem;
};

export const menuService = {
    async getMenuItems(filters?: MenuFilters): Promise<MenuItem[]> {
        const params = new URLSearchParams();

        if (filters?.branchId) params.append('branchId', filters.branchId);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.search) params.append('search', filters.search);
        if (filters?.available !== undefined) params.append('available', String(filters.available));

        const response = await apiClient.get<MenuItem[]>(`/menu/items?${params.toString()}`);
        return response.data.map(normalizeMenuItem);
    },

    async getMenuItem(id: string): Promise<MenuItem> {
        const response = await apiClient.get<MenuItem>(`/menu/items/${id}`);
        return normalizeMenuItem(response.data);
    },

    async createMenuItem(data: CreateMenuItemData): Promise<MenuItem> {
        const response = await apiClient.post<MenuItem>('/menu/items', buildMenuItemFormData(data), {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return normalizeMenuItem(response.data);
    },

    async updateMenuItem(id: string, data: Partial<CreateMenuItemData>): Promise<MenuItem> {
        const response = await apiClient.put<MenuItem>(
            `/menu/items/${id}`,
            buildMenuItemFormData(data),
            { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        return normalizeMenuItem(response.data);
    },

    async deleteMenuItem(id: string): Promise<void> {
        await apiClient.delete(`/menu/items/${id}`);
    },

    // Public endpoint for customer menu browsing
    async getPublicMenu(branchId: string): Promise<{ branch: Branch; menuItems: MenuItem[] }> {
        const response = await apiClient.get<{ branch?: Partial<Branch>; menuItems?: MenuItem[] }>(`/menu/${branchId}`);
        const data = response.data;

        if (!data.branch?.id || !data.branch.name || !data.branch.location) {
            throw new Error('Invalid menu response: missing branch information');
        }

        return {
            branch: {
                id: data.branch.id,
                name: data.branch.name,
                location: data.branch.location,
                tokenSystemEnabled: data.branch.tokenSystemEnabled ?? data.branch.hasTokenSystem,
                hasTokenSystem: data.branch.hasTokenSystem ?? data.branch.tokenSystemEnabled,
                createdAt: data.branch.createdAt,
                updatedAt: data.branch.updatedAt,
            },
            menuItems: (data.menuItems || []).map(normalizeMenuItem),
        };
    },
};
