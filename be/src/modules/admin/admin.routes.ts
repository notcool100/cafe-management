import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router: Router = Router();

// All admin routes require authentication
router.use(authenticate);

// Reports (accessible to admins and managers/staff)
router.get(
    '/reports/overview',
    requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'),
    AdminController.getReportOverview
);

// Employee Management
router.post(
    '/employees',
    requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'),
    AdminController.createEmployeeValidation,
    AdminController.createEmployee
);
router.get('/employees', requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), AdminController.listEmployees);
router.get('/employees/:id', requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), AdminController.getEmployee);
router.put('/employees/:id', requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), AdminController.updateEmployee);
router.delete('/employees/:id', requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), AdminController.deleteEmployee);

// Everything below requires admin-only permissions
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// Branch Management
router.post(
    '/branches',
    AdminController.createBranchValidation,
    AdminController.createBranch
);
router.get('/branches', AdminController.listBranches);
router.get('/branches/:id', AdminController.getBranch);
router.put('/branches/:id', AdminController.updateBranch);
router.delete('/branches/:id', AdminController.deleteBranch);

export default router;
