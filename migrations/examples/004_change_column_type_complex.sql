-- Migration: Change column type from String to Enum
-- Type: COMPLEX (requires data migration)
-- Risk Level: MEDIUM-HIGH
-- Estimated Duration: Depends on data volume
-- Rollback: Possible but complex

-- Description:
-- Converts payments.reference from TEXT to proper enum type
-- for standardized reference types (INVOICE, CHECK, BANK_REF, etc.)

-- PREREQUISITES:
-- 1. Analyze existing data distribution
-- 2. Backup database
-- 3. Test on staging environment
-- 4. Schedule maintenance window

BEGIN;

-- Step 1: Create new enum type
CREATE TYPE "ReferenceType" AS ENUM (
  'INVOICE',
  'CHECK',
  'BANK_REF',
  'TRANSACTION_ID',
  'OTHER'
);

-- Step 2: Add new column with enum type
ALTER TABLE payments 
  ADD COLUMN reference_type "ReferenceType" DEFAULT NULL;

-- Step 3: Migrate data with mapping logic
-- This is example logic - adjust based on actual data patterns
UPDATE payments
SET reference_type = CASE
  WHEN reference LIKE 'INV%' THEN 'INVOICE'::"ReferenceType"
  WHEN reference LIKE 'CHK%' THEN 'CHECK'::"ReferenceType"
  WHEN reference ~ '^[0-9]{16}$' THEN 'TRANSACTION_ID'::"ReferenceType"
  WHEN reference IS NOT NULL THEN 'OTHER'::"ReferenceType"
  ELSE NULL
END
WHERE deleted_at IS NULL;

-- Step 4: Verify migration (safety check)
DO $$
DECLARE
  unmigrated_count INT;
BEGIN
  SELECT COUNT(*) INTO unmigrated_count
  FROM payments
  WHERE reference IS NOT NULL 
    AND reference_type IS NULL
    AND deleted_at IS NULL;
  
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Found % unmigrated records', unmigrated_count;
  END IF;
END $$;

-- Step 5: Keep old column temporarily for safety
-- ALTER TABLE payments DROP COLUMN reference; -- DON'T DO THIS YET

-- Step 6: Add index on new column
CREATE INDEX idx_payments_reference_type ON payments (reference_type);

COMMIT;

-- DEPLOYMENT STRATEGY (Multi-phase):
-- 
-- Phase 1 (Deploy 1): Add new column, migrate data
--   - Run steps 1-4
--   - Monitor for 1 week
--   - Application uses old column
--
-- Phase 2 (Deploy 2): Switch application to use new column
--   - Update application code
--   - Both columns exist (dual write if needed)
--   - Monitor for 1 week
--
-- Phase 3 (Deploy 3): Remove old column
--   - ALTER TABLE payments DROP COLUMN reference;
--   - ALTER TABLE payments RENAME COLUMN reference_type TO reference;

-- ROLLBACK STRATEGY (Phase 1):
/*
BEGIN;
DROP INDEX IF EXISTS idx_payments_reference_type;
ALTER TABLE payments DROP COLUMN reference_type;
DROP TYPE "ReferenceType";
COMMIT;
*/

-- ROLLBACK STRATEGY (Phase 2):
-- Switch application back to old column

-- ROLLBACK STRATEGY (Phase 3):
-- Restore from backup (cannot easily un-drop column)

-- TESTING:
-- 1. Check enum values:
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ReferenceType'::regtype;

-- 2. Verify data migration:
SELECT reference_type, COUNT(*) 
FROM payments 
WHERE deleted_at IS NULL
GROUP BY reference_type;

-- 3. Find problematic records:
SELECT id, reference, reference_type
FROM payments
WHERE reference IS NOT NULL 
  AND reference_type IS NULL
LIMIT 100;

-- DATA QUALITY CHECKS:
-- Before migration:
SELECT 
  COUNT(*) as total,
  COUNT(reference) as has_reference,
  COUNT(DISTINCT reference) as unique_refs
FROM payments WHERE deleted_at IS NULL;

-- After migration:
SELECT 
  reference_type,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM payments
WHERE deleted_at IS NULL
GROUP BY reference_type
ORDER BY count DESC;
