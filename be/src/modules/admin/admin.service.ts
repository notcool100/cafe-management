import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import { generateBranchQR } from '../../utils/qrcode';

export class AdminService {
    static async createEmployee(data: {
        email: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'STAFF' | 'EMPLOYEE';
        branchId?: string;
    }) {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
            include: { branch: true },
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
            createdAt: user.createdAt,
        };
    }

    static async listEmployees(branchId?: string) {
        const users = await prisma.user.findMany({
            where: branchId ? { branchId } : undefined,
            include: { branch: true },
            orderBy: { createdAt: 'desc' },
        });

        return users.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
            createdAt: user.createdAt,
        }));
    }

    static async updateEmployee(
        id: string,
        data: {
            name?: string;
            role?: 'ADMIN' | 'STAFF' | 'EMPLOYEE';
            branchId?: string;
        }
    ) {
        const user = await prisma.user.update({
            where: { id },
            data,
            include: { branch: true },
        });

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
            branch: user.branch,
        };
    }

    static async deleteEmployee(id: string) {
        await prisma.user.delete({
            where: { id },
        });

        return { message: 'Employee deleted successfully' };
    }

    static async createBranch(data: {
        name: string;
        location: string;
        hasTokenSystem: boolean;
        maxTokenNumber?: number;
    }) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const branch = await prisma.branch.create({
            data: {
                name: data.name,
                location: data.location,
                hasTokenSystem: data.hasTokenSystem,
                maxTokenNumber: data.maxTokenNumber,
            },
        });

        // Generate QR code for the branch
        const qrCode = await generateBranchQR(branch.id, frontendUrl);

        // Update branch with QR code
        const updatedBranch = await prisma.branch.update({
            where: { id: branch.id },
            data: { qrCode },
        });

        return updatedBranch;
    }

    static async listBranches() {
        const branches = await prisma.branch.findMany({
            include: {
                _count: {
                    select: {
                        users: true,
                        menuItems: true,
                        orders: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return branches;
    }

    static async getBranch(id: string) {
        const branch = await prisma.branch.findUnique({
            where: { id },
            include: {
                users: true,
                _count: {
                    select: {
                        menuItems: true,
                        orders: true,
                    },
                },
            },
        });

        if (!branch) {
            throw new Error('Branch not found');
        }

        return branch;
    }

    static async updateBranch(
        id: string,
        data: {
            name?: string;
            location?: string;
            hasTokenSystem?: boolean;
            maxTokenNumber?: number;
        }
    ) {
        const branch = await prisma.branch.update({
            where: { id },
            data,
        });

        return branch;
    }

    static async deleteBranch(id: string) {
        await prisma.branch.delete({
            where: { id },
        });

        return { message: 'Branch deleted successfully' };
    }
}
