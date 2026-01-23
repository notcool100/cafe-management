import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { body, validationResult } from 'express-validator';

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
            .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE'])
            .withMessage('Invalid role'),
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
            res.status(401).json({
                error: error instanceof Error ? error.message : 'Login failed',
            });
        }
    }

    static async register(req: Request, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, name, role, branchId } = req.body;
            const result = await AuthService.register({
                email,
                password,
                name,
                role,
                branchId,
            });

            res.status(201).json(result);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Registration failed',
            });
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
            res.status(401).json({
                error: error instanceof Error ? error.message : 'Refresh token failed',
            });
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
