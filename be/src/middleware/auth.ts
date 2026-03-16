import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        tenantId?: string;
        branchIds?: string[];
        branchId?: string; // Keep for legacy compatibility during transition
    };
}

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'default-secret';

        const decoded = jwt.verify(token, secret) as {
            id: string;
            email: string;
            role: string;
            tenantId?: string;
            branchIds?: string[];
            branchId?: string;
        };

        // For backward compatibility, set branchId to the first branch if available
        if (!decoded.branchId && decoded.branchIds && decoded.branchIds.length > 0) {
            decoded.branchId = decoded.branchIds[0];
        }

        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
