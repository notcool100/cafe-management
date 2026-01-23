import { Router } from 'express';
import { MenuController } from './menu.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { uploadMenuImage } from '../../middleware/upload';

const router = Router();

// Protected routes for menu management
router.post(
    '/items',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    uploadMenuImage.single('image'),
    MenuController.createMenuItemValidation,
    MenuController.createMenuItem
);

router.get(
    '/items',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    MenuController.listMenuItems
);

router.get(
    '/items/:id',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    MenuController.getMenuItem
);

router.put(
    '/items/:id',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    uploadMenuImage.single('image'),
    MenuController.updateMenuItem
);

router.delete(
    '/items/:id',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    MenuController.deleteMenuItem
);

// Public route for customers to view menu
// Moved to bottom to avoid shadowing /items route
router.get('/:branchId', MenuController.getMenuForBranch);

export default router;
