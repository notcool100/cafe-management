import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { MenuService } from './menu.service';
import { body, validationResult } from 'express-validator';
import { getBranchUploadDirName } from '../../middleware/upload';

const isManager = (req: AuthRequest) =>
    req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE';
const managerBranchIds = (req: AuthRequest) => req.user?.branchIds || [];

const parseBranchIds = (value: unknown) => {
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

const parseNewToppings = (value: unknown) => {
    if (!value) return [];

    const parseArray = (input: unknown) => {
        if (Array.isArray(input)) {
            return input;
        }

        if (typeof input === 'string') {
            try {
                const parsed = JSON.parse(input);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }

        return [];
    };

    return parseArray(value)
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }

            const candidate = entry as { name?: unknown; price?: unknown };
            const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
            const price = Number(candidate.price);

            if (!name || !Number.isFinite(price) || price <= 0) {
                return null;
            }

            return { name, price };
        })
        .filter((entry): entry is { name: string; price: number } => Boolean(entry));
};

export class MenuController {
    static createMenuItemValidation = [
        body('name').notEmpty().withMessage('Name is required'),
        body('price')
            .custom((value) => {
                const parsed = Number(value);
                return Number.isFinite(parsed) && parsed > 0;
            })
            .withMessage('Price must be greater than 0'),
        body('branchId').isUUID().withMessage('Valid branch ID is required'),
    ];

    static updateMenuItemValidation = [
        body('price')
            .optional()
            .custom((value) => {
                const parsed = Number(value);
                return Number.isFinite(parsed) && parsed > 0;
            })
            .withMessage('Price must be greater than 0'),
    ];

    static async createMenuItem(req: AuthRequest, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, description, price, category, branchId } = req.body;
            const sharedBranchIds = parseBranchIds(req.body.sharedBranchIds);
            const disabledBranchIds = parseBranchIds(req.body.disabledBranchIds);
            const toppingIds = parseBranchIds(req.body.toppingIds);
            const newToppings = parseNewToppings(req.body.newToppings);
            if (isManager(req)) {
                const allowedBranchIds = managerBranchIds(req);
                if (allowedBranchIds.length === 0) {
                    return res.status(400).json({ error: 'Manager is not assigned to any branch' });
                }
                if (!allowedBranchIds.includes(branchId)) {
                    return res.status(403).json({ error: 'Managers can only add items for their assigned branches' });
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
                sharedBranchIds,
                disabledBranchIds,
                toppingIds,
                newToppings,
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
            const tenantId = req.user?.tenantId;
            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }

            let effectiveBranchId = branchId as string | undefined;

            if (isManager(req)) {
                const allowedBranchIds = managerBranchIds(req);
                if (allowedBranchIds.length === 0) {
                    return res.status(403).json({ error: 'Manager is not assigned to any branch' });
                }

                if (effectiveBranchId) {
                    // Normalize for robust comparison
                    const requestedId = String(effectiveBranchId).toLowerCase().trim();
                    const authorizedIds = allowedBranchIds.map(id => String(id).toLowerCase().trim());
                    
                    console.log(`[Auth Debug] Requested Branch: ${requestedId}`);
                    console.log(`[Auth Debug] Authorized Branches: ${authorizedIds.join(', ')}`);

                    // If a specific branch is requested, verify access
                    if (!authorizedIds.includes(requestedId)) {
                        return res.status(403).json({ error: 'Forbidden: Not your branch' });
                    }
                } else {
                    // Default to the first branch if none specified
                    effectiveBranchId = allowedBranchIds[0];
                }
            }

            const menuItems = await MenuService.listMenuItems(
                effectiveBranchId,
                category as string,
                tenantId
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
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            const { name, description, price, category, branchId } = req.body;
            const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
            const hasSharedBranchIds = Object.prototype.hasOwnProperty.call(req.body, 'sharedBranchIds');
            const hasDisabledBranchIds = Object.prototype.hasOwnProperty.call(req.body, 'disabledBranchIds');
            const hasToppingIds = Object.prototype.hasOwnProperty.call(req.body, 'toppingIds');
            const hasNewToppings = Object.prototype.hasOwnProperty.call(req.body, 'newToppings');
            const sharedBranchIds = hasSharedBranchIds ? parseBranchIds(req.body.sharedBranchIds) : undefined;
            const disabledBranchIds = hasDisabledBranchIds ? parseBranchIds(req.body.disabledBranchIds) : undefined;
            const toppingIds = hasToppingIds ? parseBranchIds(req.body.toppingIds) : undefined;
            const newToppings = hasNewToppings ? parseNewToppings(req.body.newToppings) : undefined;
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (isManager(req)) {
                const allowedBranchIds = managerBranchIds(req);
                if (allowedBranchIds.length === 0) {
                    return res.status(400).json({ error: 'Manager is not assigned to any branch' });
                }
                if (branchId && !allowedBranchIds.includes(branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Cannot move item to unassigned branch' });
                }
                const existing = await MenuService.getMenuItem(id as string, req.user.tenantId) as { branchId: string };
                if (!allowedBranchIds.includes(existing.branchId)) {
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
                ...(sharedBranchIds !== undefined ? { sharedBranchIds } : {}),
                ...(disabledBranchIds !== undefined ? { disabledBranchIds } : {}),
                ...(toppingIds !== undefined ? { toppingIds } : {}),
                ...(newToppings !== undefined ? { newToppings } : {}),
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
            if (!req.user?.tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (isManager(req)) {
                const allowedBranchIds = managerBranchIds(req);
                if (allowedBranchIds.length === 0) {
                    return res.status(400).json({ error: 'Manager is not assigned to any branch' });
                }
                const existing = await MenuService.getMenuItem(id as string, req.user.tenantId) as { branchId: string };
                if (!allowedBranchIds.includes(existing.branchId)) {
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
