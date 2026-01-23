// User and Authentication Types
export enum UserRole {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
    EMPLOYEE = 'EMPLOYEE'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    branchId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    branchId?: string;
}

// Branch Types
export interface Branch {
    id: string;
    name: string;
    location: string;
    qrCode?: string;
    tokenSystemEnabled: boolean;
    tokenRangeStart?: number;
    tokenRangeEnd?: number;
    currentToken?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateBranchData {
    name: string;
    location: string;
    tokenSystemEnabled: boolean;
    tokenRangeStart?: number;
    tokenRangeEnd?: number;
}

// Menu Item Types
export enum MenuCategory {
    FOOD = 'FOOD',
    BEVERAGE = 'BEVERAGE',
    DESSERT = 'DESSERT',
    APPETIZER = 'APPETIZER',
    MAIN_COURSE = 'MAIN_COURSE',
    SNACK = 'SNACK'
}

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    category: MenuCategory;
    imageUrl?: string;
    available: boolean;
    branchId: string;
    branch?: Branch;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMenuItemData {
    name: string;
    description?: string;
    price: number;
    category: MenuCategory;
    imageFile?: File | null;
    available: boolean;
    branchId: string;
}

// Order Types
export enum OrderStatus {
    PENDING = 'PENDING',
    PREPARING = 'PREPARING',
    READY = 'READY',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    menuItem?: MenuItem;
    quantity: number;
    price: number;
    createdAt: string;
}

export interface Order {
    id: string;
    branchId: string;
    branch?: Branch;
    status: OrderStatus;
    tokenNumber?: number;
    customerName?: string;
    customerPhone?: string;
    totalAmount: number;
    items: OrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateOrderData {
    branchId: string;
    customerName?: string;
    customerPhone?: string;
    items: {
        menuItemId: string;
        quantity: number;
    }[];
}

// Cart Types
export interface CartItem {
    menuItem: MenuItem;
    quantity: number;
}

// API Response Types
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
}

export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
}

// Filter Types
export interface MenuFilters {
    branchId?: string;
    category?: MenuCategory;
    search?: string;
    available?: boolean;
}

export interface OrderFilters {
    status?: OrderStatus;
    branchId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
}
