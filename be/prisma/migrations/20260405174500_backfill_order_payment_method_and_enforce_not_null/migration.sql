UPDATE "Order"
SET "paymentMethod" = 'CASH_PAYMENT'
WHERE "paymentMethod" IS NULL;

ALTER TABLE "Order"
ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH_PAYMENT';

ALTER TABLE "Order"
ALTER COLUMN "paymentMethod" SET NOT NULL;
