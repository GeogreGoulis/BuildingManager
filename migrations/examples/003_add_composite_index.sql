-- Migration: Add composite index for common query pattern
-- Type: SAFE (non-blocking if using CONCURRENTLY)
-- Risk Level: LOW
-- Estimated Duration: Depends on table size (seconds to minutes)
-- Rollback: Easy (DROP INDEX)

-- Description:
-- Adds composite index on (building_id, is_paid) for expenses table.
-- Optimizes query: "Get all unpaid expenses for a building"

BEGIN;

-- Step 1: Create index CONCURRENTLY (non-blocking, production-safe)
-- NOTE: CONCURRENTLY cannot be used inside transaction block
-- Run this outside BEGIN/COMMIT for production

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_building_paid 
  ON expenses (building_id, is_paid) 
  WHERE deleted_at IS NULL;

-- If running in test/dev (inside transaction):
-- CREATE INDEX IF NOT EXISTS idx_expenses_building_paid 
--   ON expenses (building_id, is_paid) 
--   WHERE deleted_at IS NULL;

COMMIT;

-- PRODUCTION USAGE (outside transaction):
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_building_paid 
--   ON expenses (building_id, is_paid) 
--   WHERE deleted_at IS NULL;

-- WHY PARTIAL INDEX (WHERE deleted_at IS NULL):
-- - Smaller index size
-- - Faster queries (most queries filter out soft-deleted)
-- - Automatically used when query includes "WHERE deleted_at IS NULL"

-- ROLLBACK STRATEGY:
/*
DROP INDEX CONCURRENTLY IF EXISTS idx_expenses_building_paid;
-- Or without CONCURRENTLY:
-- DROP INDEX IF EXISTS idx_expenses_building_paid;
*/

-- TESTING:
-- 1. Verify index created:
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'expenses' AND indexname = 'idx_expenses_building_paid';

-- 2. Test query uses index (EXPLAIN):
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM expenses 
WHERE building_id = 'some-uuid' 
  AND is_paid = false 
  AND deleted_at IS NULL;

-- Should show "Index Scan using idx_expenses_building_paid"

-- PERFORMANCE MONITORING:
-- Check index usage after deployment:
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname = 'idx_expenses_building_paid';

-- CLEANUP RECOMMENDATION:
-- If idx_scan = 0 after 1 month, consider removing unused index.
