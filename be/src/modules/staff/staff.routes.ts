import { Router } from 'express';
import { StaffController } from './staff.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router: Router = Router();

// All staff routes require authentication and MANAGER/EMPLOYEE/ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN', 'MANAGER', 'EMPLOYEE'));

// Get active orders for staff's branch
router.get('/orders/active', StaffController.getActiveOrders);

// Get orders by status
router.get('/orders/status/:status', StaffController.getOrdersByStatus);

// Complete an order
router.put('/orders/:id/complete', StaffController.completeOrder);

// Undo cancellation within grace period
router.put('/orders/:id/undo-cancel', StaffController.undoCancellation);

// Generate KOT
router.get('/orders/:id/kot', StaffController.generateKOT);

// Generate Bill
router.get('/orders/:id/bill', StaffController.generateBill);

// Notifications for shared items completed at other branches
router.get('/notifications/shared-items', StaffController.getSharedItemNotifications);

export default router;
