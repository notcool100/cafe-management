-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "disabledBranchIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
