ALTER TABLE "Order"
ADD COLUMN "subtotalAmount" DECIMAL(10,2),
ADD COLUMN "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "Order"
SET "subtotalAmount" = "totalAmount",
    "discountPercentage" = 0,
    "discountAmount" = 0
WHERE "subtotalAmount" IS NULL;

ALTER TABLE "Order"
ALTER COLUMN "subtotalAmount" SET NOT NULL;
