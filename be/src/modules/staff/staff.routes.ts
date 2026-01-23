import { Router } from 'express';
import { StaffController } from './staff.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

// All staff routes require authentication and STAFF or ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN', 'STAFF'));

// Get active orders for staff's branch
router.get('/orders/active', StaffController.getActiveOrders);

// Get orders by status
router.get('/orders/status/:status', StaffController.getOrdersByStatus);

// Complete an order
router.put('/orders/:id/complete', StaffController.completeOrder);

// Generate KOT
router.get('/orders/:id/kot', StaffController.generateKOT);

// Generate Bill
router.get('/orders/:id/bill', StaffController.generateBill);

export default router;
