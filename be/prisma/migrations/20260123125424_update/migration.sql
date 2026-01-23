-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLATION_PENDING';

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancellationExpiresAt" TIMESTAMP(3),
ADD COLUMN     "cancellationFinalizedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationPreviousStatus" "OrderStatus",
ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3),
ADD COLUMN     "cancellationRequestedBy" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
