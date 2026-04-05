import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
    static async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: {
                id: true,
                email: true,
                password: true,
                name: true,
                imageUrl: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                refreshToken: true,
                isActive: true,
                tenantId: true,
                branches: true,
                tenant: true,
            },
        });

        if (!user || !user.isActive) {
            throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                imageUrl: user.imageUrl,
                role: user.role,
                branchIds: user.branches.map((b: any) => b.id),
                branches: user.branches,
                tenantId: user.tenantId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    }

    static async register(data: {
        email: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'SUPER_ADMIN';
        branchIds?: string[];
        tenantId?: string;
    }) {
        const normalizedEmail = data.email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });

        if (existingUser) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        let resolvedTenantId = data.tenantId;
        if (!resolvedTenantId && data.branchIds && data.branchIds.length > 0) {
            const branch = await prisma.branch.findUnique({
                where: { id: data.branchIds[0] },
                select: { tenantId: true },
            });

            if (!branch) {
                throw new Error('Branch not found for registration');
            }

            resolvedTenantId = branch.tenantId;
        }

        if (!resolvedTenantId) {
            // Auto-provision a tenant with the starter plan for self-serve signups
            const starterPlan = await prisma.plan.upsert({
                where: { slug: 'starter' },
                update: {},
                create: {
                    slug: 'starter',
                    name: 'Starter',
                    branchesLimit: 1,
                    seatsLimit: 5,
                    menuItemsLimit: 50,
                },
            });

            const slugBase =
                normalizedEmail.split('@')[0]?.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'tenant';
            const tenant = await prisma.tenant.create({
                data: {
                    name: `${data.name}'s Cafe`,
                    slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
                    planId: starterPlan.id,
                },
            });

            await prisma.subscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: starterPlan.id,
                    status: 'ACTIVE',
                    startedAt: new Date(),
                },
            });

            resolvedTenantId = tenant.id;
        }

        if (!resolvedTenantId) {
            throw new Error('Tenant is required for registration');
        }

        const { branchIds, ...userData } = data;

        const user = await prisma.user.create({
            data: {
                ...userData,
                email: normalizedEmail,
                tenantId: resolvedTenantId,
                password: hashedPassword,
                branches: branchIds ? {
                    connect: branchIds.map(id => ({ id }))
                } : undefined
            },
            select: {
                id: true,
                email: true,
                name: true,
                imageUrl: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                tenantId: true,
                branches: true,
                tenant: true,
            },
        });

        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                imageUrl: user.imageUrl,
                role: user.role,
                branchIds: user.branches.map((b: any) => b.id),
                branches: user.branches,
                tenantId: user.tenantId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        };
    }

    static async refreshToken(refreshToken: string) {
        try {
            const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
            const decoded = jwt.verify(refreshToken, secret) as { id: string };

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    refreshToken: true,
                    tenantId: true,
                    branches: true,
                }
            });

            if (!user || !user.refreshToken) {
                throw new Error('Access Denied');
            }

            const isRefreshTokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
            if (!isRefreshTokenValid) {
                throw new Error('Invalid Refresh Token');
            }

            const tokens = await this.generateTokens(user);
            await this.updateRefreshToken(user.id, tokens.refreshToken);

            return tokens;
        } catch (error) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    static async logout(userId: string) {
        await prisma.user.updateMany({
            where: { id: userId },
            data: { refreshToken: null },
        });
    }

    private static async generateTokens(user: any) {
        const secret = process.env.JWT_SECRET || 'default-secret';
        const refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';

        const accessToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                branchIds: user.branches?.map((b: any) => b.id) || [],
            },
            secret,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            refreshSecret,
            { expiresIn: '7d' }
        );

        return { accessToken, refreshToken };
    }

    static async getMe(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                imageUrl: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                isActive: true,
                tenantId: true,
                branches: true,
                tenant: true,
            },
        });

        if (!user || !user.isActive) {
            throw new Error('User not found or inactive');
        }

        // For ADMIN/SUPER_ADMIN, provide ALL branches of the tenant
        let branches = user.branches;
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            branches = await prisma.branch.findMany({
                where: { tenantId: user.tenantId, isActive: true }
            });
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            imageUrl: user.imageUrl,
            role: user.role,
            branchIds: branches.map((b: any) => b.id),
            branches: branches,
            tenantId: user.tenantId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    private static async updateRefreshToken(userId: string, refreshToken: string) {
        const hash = await bcrypt.hash(refreshToken, 10);
        await prisma.user.updateMany({
            where: { id: userId },
            data: { refreshToken: hash },
        });
    }
}
