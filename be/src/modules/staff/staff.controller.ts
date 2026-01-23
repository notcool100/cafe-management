import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { StaffService } from './staff.service';
import { OrderService } from '../order/order.service';
import { generateKOT, generateBill } from '../../utils/pdf';

export class StaffController {
    static async getActiveOrders(req: AuthRequest, res: Response) {
        try {
            const branchId = req.user?.branchId;
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!branchId) {
                return res.status(400).json({ error: 'Staff member not assigned to a branch' });
            }

            const orders = await StaffService.getActiveOrders(branchId, tenantId);

            res.json(orders);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch active orders',
            });
        }
    }

    static async getOrdersByStatus(req: AuthRequest, res: Response) {
        try {
            const { status } = req.params as { status: string };
            const branchId = req.user?.branchId;
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!branchId) {
                return res.status(400).json({ error: 'Staff member not assigned to a branch' });
            }

            const orders = await StaffService.getOrdersByStatus(branchId, status, tenantId);

            res.json(orders);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch orders',
            });
        }
    }

    static async completeOrder(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const staffId = req.user?.id;
            const tenantId = req.user?.tenantId;
            const branchId = req.user?.branchId;

            if (!staffId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const order = await StaffService.completeOrder(id as string, staffId, tenantId, branchId);

            res.json(order);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to complete order',
            });
        }
    }

    static async undoCancellation(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const staffId = req.user?.id;
            const tenantId = req.user?.tenantId;
            const branchId = req.user?.branchId;

            const order = await OrderService.undoCancellation(id as string, staffId, tenantId, branchId);

            res.json(order);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to undo cancellation',
            });
        }
    }

    static async generateKOT(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const order = await OrderService.getOrder(id as string, req.user?.tenantId);

            const pdfBuffer = await generateKOT(order);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=KOT-${order.tokenNumber || order.id}.pdf`
            );
            res.send(pdfBuffer);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to generate KOT',
            });
        }
    }

    static async generateBill(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const order = await OrderService.getOrder(id as string, req.user?.tenantId);

            const pdfBuffer = await generateBill(order);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=Bill-${order.tokenNumber || order.id}.pdf`
            );
            res.send(pdfBuffer);
        } catch (error) {
            res.status(400).json({
                error: error instanceof Error ? error.message : 'Failed to generate bill',
            });
        }
    }
}
