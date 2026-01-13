-- Migration Rollback Strategies Guide
-- 
-- This document outlines safe rollback patterns for different migration types.

-- ============================================================================
-- STRATEGY 1: Forward-Only Migrations (Safest)
-- ============================================================================
-- Never rollback - only migrate forward to fix issues

-- Example: If enum value is wrong, add correct one and deprecate wrong one
-- DON'T: Remove wrong enum value
-- DO:     Add correct value, update data, mark old as deprecated

ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_CARD_CORRECT';
UPDATE payments SET payment_method = 'CREDIT_CARD_CORRECT' 
  WHERE payment_method = 'CREDIT_CARD_WRONG';
-- Leave CREDIT_CARD_WRONG in enum but document as deprecated


-- ============================================================================
-- STRATEGY 2: Compensating Transactions
-- ============================================================================
-- Create a new migration that undoes previous changes

-- Original migration: Add column
-- migrations/20260113_add_tags.sql
ALTER TABLE expenses ADD COLUMN tags JSONB;

-- Rollback migration: Remove column
-- migrations/20260113_remove_tags.sql
ALTER TABLE expenses DROP COLUMN tags;


-- ============================================================================
-- STRATEGY 3: Multi-Phase Deployment (Safest for Breaking Changes)
-- ============================================================================

-- Phase 1: Add new, keep old (Deploy 1)
ALTER TABLE users ADD COLUMN full_name TEXT;
UPDATE users SET full_name = first_name || ' ' || last_name;
-- App uses first_name, last_name

-- Phase 2: Switch application (Deploy 2)
-- App now uses full_name
-- Both columns exist

-- Phase 3: Remove old (Deploy 3)
ALTER TABLE users DROP COLUMN first_name;
ALTER TABLE users DROP COLUMN last_name;

-- Rollback from Phase 3: Re-add columns
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
UPDATE users SET 
  first_name = SPLIT_PART(full_name, ' ', 1),
  last_name = SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2);

-- Rollback from Phase 2: Just switch app back
-- No database changes needed


-- ============================================================================
-- STRATEGY 4: Backup and Restore Points
-- ============================================================================

-- Before risky migration, create restore point
BEGIN;
-- Your migration here
-- If something goes wrong:
ROLLBACK;

-- For production:
-- 1. pg_dump before migration
pg_dump -Fc database_name > backup_before_migration.dump

-- 2. If rollback needed:
pg_restore -d database_name backup_before_migration.dump


-- ============================================================================
-- STRATEGY 5: Feature Flags for Schema Changes
-- ============================================================================

-- Add column with feature flag check in application
ALTER TABLE expenses ADD COLUMN new_field TEXT DEFAULT NULL;

-- Application code:
-- if (featureFlags.useNewField) {
--   query.select('new_field')
-- }

-- Rollback: Disable feature flag, then drop column later


-- ============================================================================
-- ROLLBACK SAFETY CHECKLIST
-- ============================================================================

-- [ ] Tested on staging with production-like data volume
-- [ ] Rollback script tested on staging
-- [ ] Deployment can be paused mid-way
-- [ ] Database backup taken before migration
-- [ ] Migration is idempotent (can run multiple times safely)
-- [ ] Monitoring in place to detect issues
-- [ ] Rollback procedure documented and reviewed
-- [ ] On-call engineer available during deployment
-- [ ] Estimated downtime communicated
-- [ ] Rollback decision criteria defined

-- ============================================================================
-- COMMON PITFALLS
-- ============================================================================

-- ❌ DON'T: Drop column immediately after renaming
ALTER TABLE users RENAME COLUMN old_name TO new_name;
ALTER TABLE users DROP COLUMN old_name; -- DANGER!

-- ✅ DO: Keep both columns during transition
ALTER TABLE users ADD COLUMN new_name TEXT;
UPDATE users SET new_name = old_name;
-- ... wait for deployment ...
-- ... monitor ...
-- ... then drop old_name in separate migration

-- ❌ DON'T: Change NOT NULL constraint in one migration
ALTER TABLE users ALTER COLUMN email SET NOT NULL; -- Can fail if NULLs exist

-- ✅ DO: Multi-step approach
-- Step 1: Fill NULLs
UPDATE users SET email = 'unknown@example.com' WHERE email IS NULL;
-- Step 2: Add constraint
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- ❌ DON'T: Remove enum values
ALTER TYPE "Status" RENAME VALUE 'old' TO 'new'; -- NOT SUPPORTED

-- ✅ DO: Add new, migrate, deprecate old
ALTER TYPE "Status" ADD VALUE 'new';
UPDATE table SET status = 'new' WHERE status = 'old';
-- Document 'old' as deprecated, remove in future major version


-- ============================================================================
-- EMERGENCY ROLLBACK TEMPLATE
-- ============================================================================

-- If production is broken, use this template:

-- 1. STOP DEPLOYMENT
-- Stop any running migrations, pause application deployments

-- 2. ASSESS IMPACT
SELECT COUNT(*) FROM affected_table; -- Check data integrity
SELECT * FROM affected_table LIMIT 10; -- Inspect sample data

-- 3. DECIDE: ROLLBACK OR FIX FORWARD
-- If < 5 min since migration: ROLLBACK
-- If > 5 min AND data modified: FIX FORWARD

-- 4. EXECUTE ROLLBACK (if chosen)
BEGIN;
-- Run compensating transaction
-- Example: DROP COLUMN if column was added
COMMIT;

-- 5. VERIFY
-- Run test queries
-- Check application logs
-- Monitor error rates

-- 6. COMMUNICATE
-- Notify team of rollback
-- Document root cause
-- Plan fix


-- ============================================================================
-- MIGRATION RISK MATRIX
-- ============================================================================

-- LOW RISK (Safe for production)
-- - Add nullable column
-- - Add index CONCURRENTLY
-- - Add enum value
-- - Add new table

-- MEDIUM RISK (Test thoroughly)
-- - Add NOT NULL column with DEFAULT
-- - Change column type (compatible types)
-- - Add foreign key constraint
-- - Rename column (requires app changes)

-- HIGH RISK (Require maintenance window)
-- - Drop column
-- - Change column type (incompatible)
-- - Add NOT NULL to existing column
-- - Large data migration
-- - Remove enum value


-- ============================================================================
-- TESTING MIGRATIONS
-- ============================================================================

-- Test checklist:
-- 1. Run migration on copy of production data
-- 2. Measure execution time
-- 3. Test rollback
-- 4. Run again on same database (idempotency)
-- 5. Check query performance before/after
-- 6. Verify application compatibility


-- ============================================================================
-- DOCUMENTING ROLLBACK PROCEDURES
-- ============================================================================

-- Every migration should include:

/*
-- Migration: <name>
-- Risk Level: LOW | MEDIUM | HIGH
-- Estimated Duration: <time>
-- Can Run Without Downtime: YES | NO
-- 
-- ROLLBACK PROCEDURE:
-- 1. <Step 1>
-- 2. <Step 2>
-- ...
-- 
-- ROLLBACK VERIFICATION:
-- 1. <Verification query 1>
-- 2. <Verification query 2>
*/
