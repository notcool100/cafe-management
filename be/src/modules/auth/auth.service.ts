import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
    static async login(email: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { branch: true },
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
                role: user.role,
                branchId: user.branchId,
                branch: user.branch,
            },
        };
    }

    static async register(data: {
        email: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
        branchId?: string;
    }) {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw new Error('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await prisma.user.create({
            data: {
                ...data,
                password: hashedPassword,
            },
            include: { branch: true },
        });

        const tokens = await this.generateTokens(user);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                branchId: user.branchId,
                branch: user.branch,
            },
        };
    }

    static async refreshToken(refreshToken: string) {
        try {
            const secret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
            const decoded = jwt.verify(refreshToken, secret) as { id: string };

            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
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
        await prisma.user.update({
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
                branchId: user.branchId,
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

    private static async updateRefreshToken(userId: string, refreshToken: string) {
        const hash = await bcrypt.hash(refreshToken, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { refreshToken: hash },
        });
    }
}
