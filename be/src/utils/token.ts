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

        let nextToken: number;

        if (shouldReset) {
            // Reset to token 1
            nextToken = 1;
            await prisma.branch.update({
                where: { id: branchId },
                data: {
                    currentToken: 1,
                    lastTokenReset: now,
                },
            });
        } else {
            // Loop tokens within max range
            const maxToken = branch.maxTokenNumber || 99;
            nextToken = (branch.currentToken % maxToken) + 1;

            await prisma.branch.update({
                where: { id: branchId },
                data: { currentToken: nextToken },
            });
        }

        return nextToken;
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
