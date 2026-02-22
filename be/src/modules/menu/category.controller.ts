import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/auth';
import { CategoryService } from './category.service';

const isManager = (req: AuthRequest) =>
    req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE';
const managerBranchId = (req: AuthRequest) => req.user?.branchId;

const parseSharedBranchIds = (value: unknown) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
            return value
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean);
        }
    }
    return [];
};

export class CategoryController {
    static createCategoryValidation = [
        body('name').notEmpty().withMessage('Name is required'),
        body('branchId').isUUID().withMessage('Valid branch ID is required'),
    ];

    static async createCategory(req: AuthRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, branchId } = req.body;
            const sharedBranchIds = parseSharedBranchIds(req.body.sharedBranchIds);

            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                if (branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Managers can only add categories for their branch' });
                }
            }

            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            const category = await CategoryService.createCategory({
                name,
                branchId,
                sharedBranchIds,
            }, req.user.tenantId);

            res.status(201).json(category);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create category',
            });
        }
    }

    static async listCategories(req: AuthRequest, res: Response) {
        try {
            const { branchId } = req.query;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (isManager(req) && managerBranchId(req) && branchId && branchId !== managerBranchId(req)) {
                return res.status(403).json({ error: 'Forbidden: Not your branch' });
            }

            const effectiveBranchId = isManager(req) ? managerBranchId(req) : (branchId as string | undefined);

            const categories = await CategoryService.listCategories(
                effectiveBranchId,
                req.user.tenantId
            );

            res.json(categories);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch categories',
            });
        }
    }

    static async getCategory(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const category = await CategoryService.getCategory(id as string, req.user?.tenantId);

            res.json(category);
        } catch (error) {
            res.status(404).json({
                error: error instanceof Error ? error.message : 'Category not found',
            });
        }
    }

    static async updateCategory(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const hasSharedBranchIds = Object.prototype.hasOwnProperty.call(req.body, 'sharedBranchIds');
            const sharedBranchIds = hasSharedBranchIds ? parseSharedBranchIds(req.body.sharedBranchIds) : undefined;

            if (name !== undefined && !String(name).trim()) {
                return res.status(400).json({ error: 'Category name is required' });
            }

            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                const existing = await CategoryService.getCategory(id as string, req.user.tenantId);
                if (existing.branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            const category = await CategoryService.updateCategory(id as string, {
                name,
                ...(sharedBranchIds !== undefined ? { sharedBranchIds } : {}),
            }, req.user.tenantId);

            res.json(category);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to update category',
            });
        }
    }

    static async deleteCategory(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                const existing = await CategoryService.getCategory(id as string, req.user.tenantId);
                if (existing.branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            const result = await CategoryService.deleteCategory(id as string, req.user.tenantId);
            res.json(result);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to delete category',
            });
        }
    }
}
