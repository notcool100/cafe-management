import apiClient from './api-client';
import { Branch, CreateBranchData } from '../types';

export const branchService = {
    async getBranches(): Promise<Branch[]> {
        const response = await apiClient.get<Branch[]>('/admin/branches');
        return response.data;
    },

    async getBranch(id: string): Promise<Branch> {
        const response = await apiClient.get<Branch>(`/admin/branches/${id}`);
        return response.data;
    },

    async createBranch(data: CreateBranchData): Promise<Branch> {
        const response = await apiClient.post<Branch>('/admin/branches', data);
        return response.data;
    },

    async updateBranch(id: string, data: Partial<CreateBranchData>): Promise<Branch> {
        const response = await apiClient.put<Branch>(`/admin/branches/${id}`, data);
        return response.data;
    },

    async deleteBranch(id: string): Promise<void> {
        await apiClient.delete(`/admin/branches/${id}`);
    },

    // Utility function to download QR code
    downloadQRCode(qrDataUrl: string, branchName: string) {
        if (typeof window === 'undefined') return;

        const link = document.createElement('a');
        link.href = qrDataUrl;
        link.download = `${branchName.replace(/\s+/g, '_')}_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
};
