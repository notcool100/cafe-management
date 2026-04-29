import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { StaffService } from './staff.service';
import { OrderService } from '../order/order.service';
import { generateKOT, generateBill } from '../../utils/pdf';

export class StaffController {
    static async getActiveOrders(req: AuthRequest, res: Response) {
        try {
            const queryBranchId = req.query.branchId as string;
            const userBranchIds = req.user?.branchIds || [];
            const branchId = queryBranchId || (userBranchIds.length > 0 ? userBranchIds[0] : undefined);
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!branchId) {
                return res.status(400).json({ error: 'Branch ID missing' });
            }

            // Verify if manager/employee has access to this branch
            if (req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE') {
                if (!userBranchIds.includes(branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
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
            const queryBranchId = req.query.branchId as string;
            const userBranchIds = req.user?.branchIds || [];
            const branchId = queryBranchId || (userBranchIds.length > 0 ? userBranchIds[0] : undefined);
            const tenantId = req.user?.tenantId;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!branchId) {
                return res.status(400).json({ error: 'Branch ID missing' });
            }

            // Verify if manager/employee has access to this branch
            if (req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE') {
                if (!userBranchIds.includes(branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
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
            const userBranchIds = req.user?.branchIds || [];
            
            // For managers/employees, retrieve the order first to check branch access
            if (req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE') {
                const order = await OrderService.getOrder(id as string, tenantId);
                if (!userBranchIds.includes(order.branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            if (!staffId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const order = await StaffService.completeOrder(id as string, staffId, tenantId, userBranchIds);

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
            const userBranchIds = req.user?.branchIds || [];

            // For managers/employees, retrieve the order first to check branch access
            if (req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE') {
                const order = await OrderService.getOrder(id as string, tenantId);
                if (!userBranchIds.includes(order.branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            const order = await OrderService.undoCancellation(id as string, staffId, tenantId, userBranchIds);

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
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
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
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
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

    static async getSharedItemNotifications(req: AuthRequest, res: Response) {
        try {
            const queryBranchId = req.query.branchId as string;
            const userBranchIds = req.user?.branchIds || [];
            const branchId = queryBranchId || (userBranchIds.length > 0 ? userBranchIds[0] : undefined);
            const tenantId = req.user?.tenantId;
            const sinceRaw = req.query?.since as string | undefined;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!branchId) {
                return res.status(400).json({ error: 'Branch ID missing' });
            }

            // Verify branch access for shared notifications
            if (req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE') {
                if (!userBranchIds.includes(branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            const since = sinceRaw ? new Date(sinceRaw) : undefined;
            const sinceDate = since && !isNaN(since.getTime()) ? since : undefined;

            const notifications = await StaffService.getSharedItemNotifications(
                branchId,
                tenantId,
                sinceDate
            );

            res.json(notifications);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch shared item notifications',
            });
        }
    }

    static async getOrderNotifications(req: AuthRequest, res: Response) {
        try {
            const queryBranchId = req.query.branchId as string;
            const userBranchIds = req.user?.branchIds || [];
            const branchId = queryBranchId || (userBranchIds.length > 0 ? userBranchIds[0] : undefined);
            const tenantId = req.user?.tenantId;
            const sinceRaw = req.query?.since as string | undefined;

            if (!tenantId) {
                return res.status(400).json({ error: 'Tenant context missing' });
            }
            if (!branchId) {
                return res.status(400).json({ error: 'Branch ID missing' });
            }

            // Verify branch access for order notifications
            if (req.user?.role === 'MANAGER' || req.user?.role === 'EMPLOYEE') {
                if (!userBranchIds.includes(branchId)) {
                    return res.status(403).json({ error: 'Forbidden: Not your branch' });
                }
            }

            const since = sinceRaw ? new Date(sinceRaw) : undefined;
            const sinceDate = since && !isNaN(since.getTime()) ? since : undefined;

            const notifications = await StaffService.getOrderNotifications(branchId, tenantId, sinceDate);

            res.json(notifications);
        } catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Failed to fetch order notifications',
            });
        }
    }
}
