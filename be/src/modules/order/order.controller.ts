import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { OrderService } from './order.service';
import { body, validationResult } from 'express-validator';

export class OrderController {
    static createOrderValidation = [
        body('branchId').isUUID().withMessage('Valid branch ID is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.menuItemId').isUUID().withMessage('Valid menu item ID is required'),
        body('items.*.quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
    ];

    static async createOrder(req: Request, res: Response) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { branchId, items, customerName, customerPhone } = req.body;
            const order = await OrderService.createOrder({
                branchId,
                items,
                customerName,
                customerPhone,
            });

            res.status(201).json(order);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to create order',
            });
        }
    }

    static async getOrder(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const order = await OrderService.getOrder(id as string);

            res.json(order);
        } catch (error) {
            res.status(404).json({
                error: error instanceof Error ? error.message : 'Order not found',
            });
        }
    }

    static async listOrders(req: AuthRequest, res: Response) {
        try {
            const { branchId, status, startDate, endDate } = req.query;

            const filters = {
                branchId: branchId as string,
                status: status as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
            };

            const orders = await OrderService.listOrders(filters);

            res.json(orders);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch orders',
            });
        }
    }

    static async updateOrderStatus(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const completedBy = req.user?.id;

            if (!['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const order = await OrderService.updateOrderStatus(id as string, status, completedBy);

            res.json(order);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to update order',
            });
        }
    }
}
