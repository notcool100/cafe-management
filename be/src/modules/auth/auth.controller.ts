import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { body, validationResult } from 'express-validator';

const isDatabaseUnavailableError = (error: unknown) => {
    if (error instanceof Prisma.PrismaClientInitializationError) {
        return true;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    return (
        error.message.includes("Can't reach database server") ||
        error.message.includes('Error querying the database')
    );
};

const getAuthErrorResponse = (error: unknown, fallbackMessage: string) => {
    if (isDatabaseUnavailableError(error)) {
        return {
            status: 503,
            error: 'Database unavailable. Check DATABASE_URL and make sure PostgreSQL is reachable.',
        };
    }

    if (error instanceof Error && error.message === 'Invalid credentials') {
        return { status: 401, error: error.message };
    }

    return {
        status: 500,
        error: error instanceof Error ? error.message : fallbackMessage,
    };
};

export class AuthController {
    static loginValidation = [
        body('email').isEmail().withMessage('Invalid email'),
        body('password').notEmpty().withMessage('Password is required'),
    ];

    static registerValidation = [
        body('email').isEmail().withMessage('Invalid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('name').notEmpty().withMessage('Name is required'),
        body('role')
            .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE', 'SUPER_ADMIN'])
            .withMessage('Invalid role'),
        body('tenantId').optional().isUUID().withMessage('Invalid tenant'),
    ];

    static async login(req: Request, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password } = req.body;
            const result = await AuthService.login(email, password);

            res.json(result);
        } catch (error) {
            const { status, error: message } = getAuthErrorResponse(error, 'Login failed');
            res.status(status).json({ error: message });
        }
    }

    static async register(req: Request, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, name, role, branchIds, tenantId } = req.body;
            const result = await AuthService.register({
                email,
                password,
                name,
                role,
                branchIds,
                tenantId,
            });

            res.status(201).json(result);
        } catch (error) {
            const { status, error: message } = getAuthErrorResponse(error, 'Registration failed');
            res.status(status).json({ error: message });
        }
    }

    static async getMe(req: any, res: Response) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const result = await AuthService.getMe(req.user.id);
            res.json(result);
        } catch (error) {
            const { status, error: message } = getAuthErrorResponse(error, 'Failed to fetch profile');
            res.status(status).json({ error: message });
        }
    }

    static async refreshToken(req: Request, res: Response) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token is required' });
            }

            const result = await AuthService.refreshToken(refreshToken);
            res.json(result);
        } catch (error) {
            const { status, error: message } = getAuthErrorResponse(error, 'Refresh token failed');
            res.status(status === 500 ? 401 : status).json({ error: message });
        }
    }

    static async logout(req: Request, res: Response) {
        try {
            // Optional: Invalidate refresh token if user ID is available
            // This requires the route to be authenticated or passing userId
            const { userId } = req.body;
            if (userId) {
                await AuthService.logout(userId);
            }
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            res.status(500).json({ error: 'Logout failed' });
        }
    }
}
