import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { MenuService } from './menu.service';
import { body, validationResult } from 'express-validator';
import { getBranchUploadDirName } from '../../middleware/upload';

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
            });

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
            const menuItems = await MenuService.listMenuItems(
                branchId as string,
                category as string
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
            const menuItem = await MenuService.getMenuItem(id as string);

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
            });

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
            const result = await MenuService.deleteMenuItem(id as string);

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
