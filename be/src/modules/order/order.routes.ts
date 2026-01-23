import { Router } from 'express';
import { OrderController } from './order.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

const router = Router();

// Public route for customers to create orders
router.post('/', OrderController.createOrderValidation, OrderController.createOrder);

// Public route to get order details (for customer)
router.get('/:id', OrderController.getOrder);

// Protected routes for staff
router.get(
    '/',
    authenticate,
    requireRole('ADMIN', 'MANAGER'),
    OrderController.listOrders
);

router.put(
    '/:id/status',
    authenticate,
    requireRole('ADMIN', 'MANAGER'),
    OrderController.updateOrderStatus
);

export default router;
