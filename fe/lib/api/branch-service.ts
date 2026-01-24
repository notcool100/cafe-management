import apiClient from './api-client';
import { Branch, CreateBranchData } from '../types';

const normalizeBranch = (branch: Partial<Branch>): Branch => {
    const tokenEnabled = branch?.tokenSystemEnabled ?? branch?.hasTokenSystem ?? false;
    const tokenRangeEnd = branch?.tokenRangeEnd ?? branch?.maxTokenNumber;

    return {
        ...branch,
        hasTokenSystem: branch?.hasTokenSystem ?? tokenEnabled,
        tokenSystemEnabled: tokenEnabled,
        tokenRangeStart: branch?.tokenRangeStart ?? (tokenEnabled ? 1 : undefined),
        tokenRangeEnd,
        maxTokenNumber: branch?.maxTokenNumber ?? tokenRangeEnd,
    } as Branch;
};

const toPayload = (data: Partial<CreateBranchData>) => {
    const maxToken = data.tokenSystemEnabled
        ? data.tokenRangeEnd ?? data.maxTokenNumber
        : undefined;

    return {
        name: data.name,
        location: data.location,
        hasTokenSystem: data.tokenSystemEnabled,
        tokenSystemEnabled: data.tokenSystemEnabled,
        tokenRangeStart: data.tokenSystemEnabled ? data.tokenRangeStart : undefined,
        tokenRangeEnd: maxToken,
        maxTokenNumber: maxToken,
    };
};

export const branchService = {
    async getBranches(): Promise<Branch[]> {
        const response = await apiClient.get<Branch[]>('/admin/branches');
        return response.data.map(normalizeBranch);
    },

    async getBranch(id: string): Promise<Branch> {
        const response = await apiClient.get<Branch>(`/admin/branches/${id}`);
        return normalizeBranch(response.data);
    },

    async createBranch(data: CreateBranchData): Promise<Branch> {
        const response = await apiClient.post<Branch>('/admin/branches', toPayload(data));
        return normalizeBranch(response.data);
    },

    async updateBranch(id: string, data: Partial<CreateBranchData>): Promise<Branch> {
        const response = await apiClient.put<Branch>(`/admin/branches/${id}`, toPayload(data));
        return normalizeBranch(response.data);
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
