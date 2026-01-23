import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { MenuService } from './menu.service';
import { body, validationResult } from 'express-validator';
import { getBranchUploadDirName } from '../../middleware/upload';

const isManager = (req: AuthRequest) =>
    req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE';
const managerBranchId = (req: AuthRequest) => req.user?.branchId;

export class MenuController {
    static createMenuItemValidation = [
        body('name').notEmpty().withMessage('Name is required'),
        body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
        body('branchId').isUUID().withMessage('Valid branch ID is required'),
    ];

    static async createMenuItem(req: AuthRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, description, price, category, branchId } = req.body;
            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                if (branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Managers can only add items for their branch' });
                }
            }
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
            const branchDirName = getBranchUploadDirName(branchId);
            const imageUrl = file ? `/uploads/${branchDirName}/${file.filename}` : undefined;
            const menuItem = await MenuService.createMenuItem({
                name,
                description,
                price: Number(price),
                category,
                imageUrl,
                branchId,
            }, req.user.tenantId);

            res.status(201).json(menuItem);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create menu item',
            });
        }
    }

    static async listMenuItems(req: AuthRequest, res: Response) {
        try {
            const { branchId, category } = req.query;
            if (isManager(req) && managerBranchId(req) && branchId && branchId !== managerBranchId(req)) {
                return res.status(403).json({ error: 'Forbidden: Not your branch' });
            }
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            const effectiveBranchId = isManager(req) ? managerBranchId(req) : (branchId as string | undefined);
            const menuItems = await MenuService.listMenuItems(
                effectiveBranchId,
                category as string,
                req.user.tenantId
            );

            res.json(menuItems);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch menu items',
            });
        }
    }

    static async getMenuItem(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const menuItem = await MenuService.getMenuItem(id as string, (req as AuthRequest).user?.tenantId);

            res.json(menuItem);
        } catch (error) {
            res.status(404).json({
                error: error instanceof Error ? error.message : 'Menu item not found',
            });
        }
    }

    static async updateMenuItem(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, price, category, branchId } = req.body;
            const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                if (branchId && branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
                const existing = await MenuService.getMenuItem(id as string, req.user.tenantId);
                if (existing.branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }
            const branchDirName = getBranchUploadDirName(branchId);
            const imageUrl = file ? `/uploads/${branchDirName}/${file.filename}` : undefined;
            const isAvailableRaw = req.body.isAvailable ?? req.body.available;
            const isAvailable =
                typeof isAvailableRaw === 'string' ? isAvailableRaw === 'true' : isAvailableRaw;

            const menuItem = await MenuService.updateMenuItem(id as string, {
                name,
                description,
                price: price !== undefined ? Number(price) : undefined,
                category,
                imageUrl,
                isAvailable,
            }, req.user.tenantId);

            res.json(menuItem);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to update menu item',
            });
        }
    }

    static async deleteMenuItem(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (isManager(req)) {
                if (!managerBranchId(req)) {
                    return res.status(400).json({ error: 'Manager is not assigned to a branch' });
                }
                const existing = await MenuService.getMenuItem(id as string, req.user.tenantId);
                if (existing.branchId !== managerBranchId(req)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }
            const result = await MenuService.deleteMenuItem(id as string, req.user.tenantId);

            res.json(result);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to delete menu item',
            });
        }
    }

    // Public endpoint for customers
    static async getMenuForBranch(req: Request, res: Response) {
        try {
            const { branchId } = req.params;
            const menu = await MenuService.getMenuForBranch(branchId as string);

            res.json(menu);
        } catch (error) {
            res.status(404).json({
                error: error instanceof Error ? error.message : 'Menu not found',
            });
        }
    }
}
