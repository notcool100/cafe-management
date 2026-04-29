DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'PaymentMethod'
    ) THEN
        CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'FONEPAY', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Order'
          AND column_name = 'paymentMethod'
    ) THEN
        ALTER TABLE "Order"
        ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';
    END IF;
END $$;
