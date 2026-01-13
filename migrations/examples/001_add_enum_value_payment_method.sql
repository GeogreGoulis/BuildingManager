-- Migration: Add new enum value to PaymentMethod
-- Type: SAFE (non-breaking, backward compatible)
-- Risk Level: LOW
-- Estimated Duration: < 1 second
-- Rollback: See rollback section

-- Description:
-- Adds new payment method "CREDIT_CARD" to existing PaymentMethod enum.
-- This is safe because existing data is not affected.

BEGIN;

-- Step 1: Add new enum value
ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_CARD';

-- Step 2: Verify (optional, for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'CREDIT_CARD'
      AND enumtypid = 'PaymentMethod'::regtype
  ) THEN
    RAISE EXCEPTION 'CREDIT_CARD value not added to PaymentMethod enum';
  END IF;
END $$;

COMMIT;

-- ROLLBACK STRATEGY:
-- PostgreSQL does not support removing enum values directly.
-- Options:
-- 1. Leave value (safest, mark as deprecated in docs)
-- 2. Create new enum type and migrate:
--
-- BEGIN;
-- CREATE TYPE "PaymentMethod_new" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHECK', 'ONLINE');
-- ALTER TABLE payments ALTER COLUMN payment_method TYPE "PaymentMethod_new" 
--   USING payment_method::text::"PaymentMethod_new";
-- DROP TYPE "PaymentMethod";
-- ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
-- COMMIT;

-- TESTING:
-- 1. Verify enum values:
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'PaymentMethod'::regtype ORDER BY enumlabel;

-- 2. Test insert with new value:
-- INSERT INTO payments (..., payment_method) VALUES (..., 'CREDIT_CARD');
