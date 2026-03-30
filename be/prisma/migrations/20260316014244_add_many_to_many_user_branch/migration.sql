/*
  Warnings:

  - You are about to drop the column `branchId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_branchId_fkey";

-- DropIndex
DROP INDEX "User_branchId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "branchId";

-- CreateTable
CREATE TABLE "_BranchToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BranchToUser_AB_unique" ON "_BranchToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_BranchToUser_B_index" ON "_BranchToUser"("B");

-- AddForeignKey
ALTER TABLE "_BranchToUser" ADD CONSTRAINT "_BranchToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BranchToUser" ADD CONSTRAINT "_BranchToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
