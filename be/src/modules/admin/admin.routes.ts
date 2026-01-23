import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

// Employee Management
router.post(
    '/employees',
    AdminController.createEmployeeValidation,
    AdminController.createEmployee
);
router.get('/employees', AdminController.listEmployees);
router.put('/employees/:id', AdminController.updateEmployee);
router.delete('/employees/:id', AdminController.deleteEmployee);

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
