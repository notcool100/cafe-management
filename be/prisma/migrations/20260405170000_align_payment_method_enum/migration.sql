DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'PaymentMethod'
          AND e.enumlabel = 'CASH'
    ) THEN
        ALTER TYPE "PaymentMethod" RENAME VALUE 'CASH' TO 'CASH_PAYMENT';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'PaymentMethod'
          AND e.enumlabel = 'FONEPAY'
    ) THEN
        ALTER TYPE "PaymentMethod" ADD VALUE 'FONEPAY';
    END IF;
END $$;

ALTER TABLE "Order"
ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH_PAYMENT';
