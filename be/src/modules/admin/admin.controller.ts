import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AdminService } from './admin.service';
import { body, validationResult } from 'express-validator';

export class AdminController {
    // Employee Management
    static createEmployeeValidation = [
        body('email').isEmail().withMessage('Invalid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('name').notEmpty().withMessage('Name is required'),
        body('role')
            .isIn(['ADMIN', 'STAFF', 'EMPLOYEE'])
            .withMessage('Invalid role'),
    ];

    static async createEmployee(req: AuthRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, name, role, branchId } = req.body;
            const employee = await AdminService.createEmployee({
                email,
                password,
                name,
                role,
                branchId,
            });

            res.status(201).json(employee);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create employee',
            });
        }
    }

    static async listEmployees(req: AuthRequest, res: Response) {
        try {
            const { branchId } = req.query;
            const employees = await AdminService.listEmployees(branchId as string);

            res.json(employees);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch employees',
            });
        }
    }

    static async updateEmployee(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name, role, branchId } = req.body;

            const employee = await AdminService.updateEmployee(id as string, {
                name,
                role,
                branchId,
            });

            res.json(employee);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to update employee',
            });
        }
    }

    static async deleteEmployee(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const result = await AdminService.deleteEmployee(id as string);

            res.json(result);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to delete employee',
            });
        }
    }

    // Branch Management
    static createBranchValidation = [
        body('name').notEmpty().withMessage('Branch name is required'),
        body('location').notEmpty().withMessage('Location is required'),
        body('hasTokenSystem').optional().isBoolean().withMessage('Token system flag must be boolean'),
        body('tokenSystemEnabled').optional().isBoolean().withMessage('Token system flag must be boolean'),
        body('maxTokenNumber')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Max token number must be a positive integer'),
        body('tokenRangeEnd')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Token range end must be a positive integer'),
        body('tokenRangeStart')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Token range start must be a positive integer'),
        body().custom((_, { req }) => {
            const hasTokenFlag =
                typeof req.body?.hasTokenSystem === 'boolean' ||
                typeof req.body?.tokenSystemEnabled === 'boolean';

            if (!hasTokenFlag) {
                throw new Error('Token system flag must be boolean');
            }

            return true;
        }),
    ];

    static async createBranch(req: AuthRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const {
                name,
                location,
                hasTokenSystem,
                maxTokenNumber,
                tokenSystemEnabled,
                tokenRangeEnd,
            } = req.body;

            const resolvedHasTokenSystem =
                typeof hasTokenSystem === 'boolean' ? hasTokenSystem : tokenSystemEnabled;
            const resolvedMaxTokenNumber = maxTokenNumber ?? tokenRangeEnd;
            const parsedMaxTokenNumber =
                resolvedMaxTokenNumber === undefined ? undefined : Number(resolvedMaxTokenNumber);

            const branch = await AdminService.createBranch({
                name,
                location,
                hasTokenSystem: resolvedHasTokenSystem,
                maxTokenNumber: parsedMaxTokenNumber,
            });

            res.status(201).json(branch);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create branch',
            });
        }
    }

    static async listBranches(req: AuthRequest, res: Response) {
        try {
            const branches = await AdminService.listBranches();
            res.json(branches);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch branches',
            });
        }
    }

    static async getBranch(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const branch = await AdminService.getBranch(id as string);
            res.json(branch);
        } catch (error) {
            res.status(404).json({
                error: error instanceof Error ? error.message : 'Branch not found',
            });
        }
    }

    static async updateBranch(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const {
                name,
                location,
                hasTokenSystem,
                maxTokenNumber,
                tokenSystemEnabled,
                tokenRangeEnd,
            } = req.body;

            const resolvedHasTokenSystem =
                typeof hasTokenSystem === 'boolean' ? hasTokenSystem : tokenSystemEnabled;
            const resolvedMaxTokenNumber = maxTokenNumber ?? tokenRangeEnd;
            const parsedMaxTokenNumber =
                resolvedMaxTokenNumber === undefined ? undefined : Number(resolvedMaxTokenNumber);

            const branch = await AdminService.updateBranch(id as string, {
                name,
                location,
                hasTokenSystem: resolvedHasTokenSystem,
                maxTokenNumber: parsedMaxTokenNumber,
            });

            res.json(branch);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to update branch',
            });
        }
    }

    static async deleteBranch(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const result = await AdminService.deleteBranch(id as string);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to delete branch',
            });
        }
    }
}
