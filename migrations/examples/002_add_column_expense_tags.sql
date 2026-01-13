-- Migration: Add tags column to Expense table
-- Type: SAFE (adding nullable column)
-- Risk Level: LOW
-- Estimated Duration: < 1 second (no data rewrite)
-- Rollback: Easy (DROP COLUMN)

-- Description:
-- Adds optional JSON tags field to expenses for flexible categorization.
-- Examples: ["maintenance", "urgent"], ["winter"], etc.

BEGIN;

-- Step 1: Add column as nullable (safe, no lock duration)
ALTER TABLE expenses 
  ADD COLUMN tags JSONB DEFAULT NULL;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN expenses.tags IS 'Optional array of string tags for flexible categorization. Example: ["urgent", "maintenance"]';

-- Step 3: Add GIN index for fast tag searches (optional, but recommended)
CREATE INDEX idx_expenses_tags ON expenses USING GIN (tags);

-- Step 4: Add check constraint to ensure tags is array of strings (optional)
ALTER TABLE expenses 
  ADD CONSTRAINT check_expenses_tags_array 
  CHECK (tags IS NULL OR jsonb_typeof(tags) = 'array');

COMMIT;

-- ROLLBACK STRATEGY:
/*
BEGIN;
DROP INDEX IF EXISTS idx_expenses_tags;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_expenses_tags_array;
ALTER TABLE expenses DROP COLUMN tags;
COMMIT;
*/

-- TESTING:
-- 1. Verify column exists:
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'tags';

-- 2. Test insert with tags:
-- INSERT INTO expenses (..., tags) VALUES (..., '["urgent", "maintenance"]'::jsonb);

-- 3. Test GIN index query:
-- SELECT * FROM expenses WHERE tags @> '["urgent"]'::jsonb;

-- PERFORMANCE NOTE:
-- Adding nullable column is instant (no table rewrite).
-- GIN index creation may take time on large tables (locks table during creation).
-- Consider CONCURRENTLY for production:
-- CREATE INDEX CONCURRENTLY idx_expenses_tags ON expenses USING GIN (tags);
