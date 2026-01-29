import prisma from '../config/database';

export class TokenManager {
    /**
     * Generate a token for an order
     * Implements daily reset and looping logic
     */
    static async generateToken(branchId: string): Promise<number | null> {
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
        });

        if (!branch || !branch.hasTokenSystem) {
            return null; // No token for branches without token system
        }

        // Check if we need to reset tokens (daily reset)
        const now = new Date();
        const lastReset = branch.lastTokenReset;
        const shouldReset = this.shouldResetTokens(lastReset, now);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        let nextToken: number;

        if (shouldReset) {
            // Reset to token 1
            nextToken = 1;
        } else {
            // Loop tokens within max range
            const maxToken = branch.maxTokenNumber || 99;
            nextToken = (branch.currentToken % maxToken) + 1;
        }

        // Find first available token that isn't currently in use
        const maxToken = branch.maxTokenNumber || 99;
        const activeStatuses = ['PENDING', 'PREPARING', 'READY', 'CANCELLATION_PENDING'];
        const activeOrders = await prisma.order.findMany({
            where: {
                branchId,
                status: { in: activeStatuses as any },
                tokenNumber: { not: null },
                createdAt: { gte: todayStart }, // ignore previous-day tokens after reset
            },
            select: { tokenNumber: true },
        });

        const usedTokens = new Set<number>(
            activeOrders
                .map((o) => o.tokenNumber)
                .filter((n): n is number => typeof n === 'number')
        );

        let candidate = nextToken;
        let attempts = 0;
        while (attempts < maxToken) {
            if (!usedTokens.has(candidate)) {
                await prisma.branch.update({
                    where: { id: branchId },
                    data: {
                        currentToken: candidate,
                        ...(shouldReset ? { lastTokenReset: now } : {}),
                    },
                });
                return candidate;
            }
            candidate = (candidate % maxToken) + 1;
            attempts += 1;
        }

        throw new Error('No available tokens for this branch. Please complete or cancel orders to free tokens.');
    }

    /**
     * Check if tokens should be reset (new day)
     */
    private static shouldResetTokens(lastReset: Date, currentTime: Date): boolean {
        const lastResetDate = new Date(lastReset);
        lastResetDate.setHours(0, 0, 0, 0);

        const currentDate = new Date(currentTime);
        currentDate.setHours(0, 0, 0, 0);

        return currentDate.getTime() > lastResetDate.getTime();
    }
}
