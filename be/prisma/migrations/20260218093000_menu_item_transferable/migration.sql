-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "isTransferable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MenuItemBorrow" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "targetBranchId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemBorrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemBorrow_menuItemId_targetBranchId_key" ON "MenuItemBorrow"("menuItemId", "targetBranchId");

-- CreateIndex
CREATE INDEX "MenuItemBorrow_menuItemId_idx" ON "MenuItemBorrow"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemBorrow_targetBranchId_idx" ON "MenuItemBorrow"("targetBranchId");

-- CreateIndex
CREATE INDEX "MenuItemBorrow_tenantId_idx" ON "MenuItemBorrow"("tenantId");

-- AddForeignKey
ALTER TABLE "MenuItemBorrow" ADD CONSTRAINT "MenuItemBorrow_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemBorrow" ADD CONSTRAINT "MenuItemBorrow_targetBranchId_fkey" FOREIGN KEY ("targetBranchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemBorrow" ADD CONSTRAINT "MenuItemBorrow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
