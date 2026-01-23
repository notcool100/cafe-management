import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { AdminService } from './admin.service';
import { body, validationResult } from 'express-validator';

const isManager = (req: AuthRequest) => req.user?.role === 'MANAGER';
const managerBranchId = (req: AuthRequest) => req.user?.branchId;

export class AdminController {
    private static readonly DEFAULT_REPORT_RANGE_DAYS = 30;

    // Employee Management
    static createEmployeeValidation = [
        body('email').isEmail().withMessage('Invalid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('name').notEmpty().withMessage('Name is required'),
        body('role')
            .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE'])
            .withMessage('Invalid role'),
    ];

    static async createEmployee(req: AuthRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, name, role, branchId } = req.body;
            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                if (role === 'ADMIN') {
                    return res.status(403).json({ error: 'Managers cannot create admins' });
                }
                if (branchId && branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Managers can only create users in their branch' });
                }
            }
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const employee = await AdminService.createEmployee({
                email,
                password,
                name,
                role,
                branchId: isManager(req) ? managerBranchId(req) : branchId,
                tenantId: req.user.tenantId,
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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const effectiveBranchId = isManager(req)
                ? managerBranchId(req)
                : (branchId as string | undefined);
            const employees = await AdminService.listEmployees(req.user.tenantId, effectiveBranchId);

            res.json(employees);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch employees',
            });
        }
    }

    static async getEmployee(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const employee = await AdminService.getEmployee(id as string, req.user.tenantId);
            if (isManager(req) && managerBranchId(req) && employee.branchId !== managerBranchId(req)) {
                return res.status(403).json({ error: 'Forbidden: Not your branch' });
            }
            res.json(employee);
        } catch (error) {
            res.status(404).json({
                error: error instanceof Error ? error.message : 'Employee not found',
            });
        }
    }

    static async updateEmployee(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name, role, branchId } = req.body;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            if (isManager(req)) {
                if (role === 'ADMIN') {
                    return res.status(403).json({ error: 'Managers cannot promote to admin' });
                }
                if (branchId && branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Managers can only reassign within their branch' });
                }
                const employee = await AdminService.getEmployee(id as string, req.user.tenantId);
                if (employee.branchId && employee.branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            const employee = await AdminService.updateEmployee(
                id as string,
                req.user.tenantId,
                {
                name,
                role,
                branchId: isManager(req) ? managerBranchId(req) : branchId,
                }
            );

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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (isManager(req)) {
                const employee = await AdminService.getEmployee(id as string, req.user.tenantId);
                if (employee.branchId && employee.branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
                if (employee.role === 'ADMIN') {
                    return res.status(403).json({ error: 'Managers cannot remove admins' });
                }
            }
            const result = await AdminService.deleteEmployee(id as string, req.user.tenantId);

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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

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
                tenantId: req.user.tenantId,
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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const branches = await AdminService.listBranches(req.user.tenantId);
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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const branch = await AdminService.getBranch(id as string, req.user.tenantId);
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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            const resolvedHasTokenSystem =
                typeof hasTokenSystem === 'boolean' ? hasTokenSystem : tokenSystemEnabled;
            const resolvedMaxTokenNumber = maxTokenNumber ?? tokenRangeEnd;
            const parsedMaxTokenNumber =
                resolvedMaxTokenNumber === undefined ? undefined : Number(resolvedMaxTokenNumber);

            const branch = await AdminService.updateBranch(
                id as string,
                req.user.tenantId,
                {
                    name,
                    location,
                    hasTokenSystem: resolvedHasTokenSystem,
                    maxTokenNumber: parsedMaxTokenNumber,
                }
            );

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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const result = await AdminService.deleteBranch(id as string, req.user.tenantId);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to delete branch',
            });
        }
    }

    static async getReportOverview(req: AuthRequest, res: Response) {
        try {
            const { branchId, startDate, endDate } = req.query;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            const parsedEndDate = endDate ? new Date(endDate as string) : new Date();
            const parsedStartDate = startDate
                ? new Date(startDate as string)
                : new Date(parsedEndDate);

            parsedStartDate.setHours(0, 0, 0, 0);
            parsedEndDate.setHours(23, 59, 59, 999);

            if (!startDate) {
                parsedStartDate.setDate(
                    parsedStartDate.getDate() - (AdminController.DEFAULT_REPORT_RANGE_DAYS - 1)
                );
            }

            if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date range provided' });
            }

            if (parsedStartDate > parsedEndDate) {
                return res.status(400).json({ error: 'Start date must be before end date' });
            }

            const isStaffManager = req.user?.role === 'MANAGER';
            const resolvedBranchId =
                branchId === 'all'
                    ? undefined
                    : (branchId as string | undefined);

            if (isStaffManager && !req.user?.branchId) {
                return res.status(400).json({ error: 'Staff member is not assigned to a branch' });
            }

            const report = await AdminService.getReportOverview({
                branchId: isStaffManager ? req.user?.branchId : resolvedBranchId,
                startDate: parsedStartDate,
                endDate: parsedEndDate,
                tenantId: req.user.tenantId,
            });

            res.json(report);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to generate report',
            });
        }
    }
}
