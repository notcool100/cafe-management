-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "sharedBranchIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
