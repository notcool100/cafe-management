export interface MenuItemFormData {
    name: string;
    description: string;
    price: number;
    category: string;
    branchId: string;
    imageFile: File | null;
    available: boolean;
    isTransferable?: boolean;
    borrowedByBranchIds?: string[];
}
