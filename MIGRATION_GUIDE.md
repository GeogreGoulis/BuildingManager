# Database Migration Guide: Enhanced Schema v2

## Overview
This guide covers the migration from the basic schema to the enhanced schema with:
- ✅ 6 Enums (RoleType, PaymentMethod, DocumentCategory, EventType, AnnouncementPriority, AuditAction)
- ✅ Soft delete support (deletedAt fields on 13 models)
- ✅ 47 Indexes (single-column + composite)
- ✅ Enhanced AuditLog (oldValue/newValue structure)

---

## Pre-Migration Checklist

### 1. Backup Database
```bash
# Create backup before migration
docker exec building-manager-postgres pg_dump -U postgres building_manager > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

### 2. Check Current Schema
```bash
# Connect to database
docker exec -it building-manager-postgres psql -U postgres -d building_manager

# List tables
\dt

# Check existing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

# Exit psql
\q
```

### 3. Verify Application State
```bash
# Ensure no app is connected to database
docker ps | grep building-manager

# Stop development server if running
# Ctrl+C in the terminal where npm run start:dev is running
```

---

## Migration Steps

### Step 1: Generate Migration

```bash
# Generate migration from enhanced schema.prisma
npx prisma migrate dev --name enhanced-schema-v2
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "building_manager", schema "public" at "localhost:5432"

Prisma Migrate created and applied the following migration(s) from new schema changes:

migrations/
  └─ 20260113XXXXXX_enhanced_schema_v2/
      └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (5.8.0 | library) to ./node_modules/@prisma/client in XXXms
```

### Step 2: Inspect Migration SQL

```bash
# Find the generated migration file
ls -la prisma/migrations/

# View the migration SQL
cat prisma/migrations/*_enhanced_schema_v2/migration.sql
```

**What to expect in migration.sql:**
- CREATE TYPE statements for enums
- ALTER TABLE statements adding deletedAt columns
- CREATE INDEX statements for all 47 indexes
- ALTER TABLE statements for AuditLog changes

### Step 3: Apply Migration (if not auto-applied)

```bash
# If migration wasn't auto-applied, run:
npx prisma migrate deploy
```

### Step 4: Regenerate Prisma Client

```bash
# Generate TypeScript types for new schema
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client (5.8.0 | library) to ./node_modules/@prisma/client in XXXms

Start using Prisma Client in Node.js (See: https://pris.ly/d/client)
```

### Step 5: Run Seed with Updated Enums

```bash
# Run seed to create roles with enum values
npx prisma db seed
```

**Expected Output:**
```
🌱 Starting database seed...
✅ Roles created
✅ Super Admin user created
✅ Expense categories created
🎉 Seed completed successfully!

📧 Super Admin credentials:
   Email: admin@buildingmanager.com
   Password: Admin123!
```

---

## Verification

### 1. Verify Enums Created

```bash
docker exec -it building-manager-postgres psql -U postgres -d building_manager
```

```sql
-- List all enums
SELECT typname 
FROM pg_type 
WHERE typtype = 'e'
ORDER BY typname;

-- Expected output:
--   AuditAction
--   AnnouncementPriority
--   DocumentCategory
--   EventType
--   PaymentMethod
--   RoleType

-- Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'RoleType'::regtype
ORDER BY enumlabel;

-- Expected output:
--   BUILDING_ADMIN
--   READ_ONLY
--   SUPER_ADMIN
```

### 2. Verify Soft Delete Columns

```sql
-- Check which tables have deletedAt
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'deleted_at'
  AND table_schema = 'public'
ORDER BY table_name;

-- Expected: 13 tables (User, Role, Building, Apartment, etc.)
```

### 3. Verify Indexes Created

```sql
-- Count indexes per table
SELECT 
  tablename, 
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY index_count DESC, tablename;

-- Check specific composite index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname = 'idx_users_email_active';

-- Expected output shows index on (email, is_active) WHERE deleted_at IS NULL
```

### 4. Verify AuditLog Structure

```sql
\d audit_logs

-- Should show:
--   old_value: jsonb
--   new_value: jsonb
--   metadata: jsonb
--   action: AuditAction enum
```

### 5. Test Seed Data

```sql
-- Check roles use enum
SELECT id, name, description FROM roles;

-- Should show name column as enum type, not text
```

```sql
\q  -- Exit psql
```

---

## Start Application

```bash
# Start development server
npm run start:dev
```

**Expected Output:**
```
[Nest] XXXXX  - [NestFactory] Starting Nest application...
[Nest] XXXXX  - [InstanceLoader] PrismaModule dependencies initialized
[Nest] XXXXX  - [InstanceLoader] ConfigModule dependencies initialized
[Nest] XXXXX  - [NestApplication] Nest application successfully started
🚀 Building Manager API is running on: http://localhost:3000
```

---

## Test API with New Schema

### 1. Get JWT Token

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@buildingmanager.com",
    "password": "Admin123!"
  }' | jq

# Save token
source .env
echo $TOKEN
```

### 2. Test User Query (with soft delete middleware)

```bash
# Create a test user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+306987654321"
  }' | jq

# List users (should see both admin and test user)
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" | jq

# Soft delete test user
curl -X DELETE http://localhost:3000/users/{TEST_USER_ID} \
  -H "Authorization: Bearer $TOKEN"

# List users again (test user should NOT appear - soft deleted)
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. Verify Soft Delete in Database

```bash
docker exec -it building-manager-postgres psql -U postgres -d building_manager
```

```sql
-- Show all users including soft-deleted
SELECT id, email, first_name, last_name, deleted_at
FROM users;

-- Test user should have deleted_at timestamp set
```

---

## Rollback (if needed)

### Option 1: Rollback Last Migration

```bash
# Revert to previous migration
npx prisma migrate resolve --rolled-back "MIGRATION_NAME"

# Then restore from backup
docker exec -i building-manager-postgres psql -U postgres -d building_manager < backup_YYYYMMDD_HHMMSS.sql
```

### Option 2: Reset Database (DEV ONLY)

```bash
# ⚠️ WARNING: This will DELETE ALL DATA
npx prisma migrate reset

# Re-run seed
npx prisma db seed
```

---

## Troubleshooting

### Issue: Migration fails with "type already exists"

**Cause:** Enums already exist from previous manual creation

**Solution:**
```bash
# Connect to database
docker exec -it building-manager-postgres psql -U postgres -d building_manager

# Drop existing enums
DROP TYPE IF EXISTS "RoleType" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "DocumentCategory" CASCADE;
DROP TYPE IF EXISTS "EventType" CASCADE;
DROP TYPE IF EXISTS "AnnouncementPriority" CASCADE;
DROP TYPE IF EXISTS "AuditAction" CASCADE;

\q

# Re-run migration
npx prisma migrate dev --name enhanced-schema-v2
```

### Issue: "Column deletedAt already exists"

**Cause:** Manual schema changes outside Prisma

**Solution:**
```bash
# Reset migrations
npx prisma migrate reset

# Re-run seed
npx prisma db seed
```

### Issue: Seed fails with enum type error

**Error:**
```
Invalid value for argument 'name': 'SUPER_ADMIN'
```

**Cause:** TypeScript not using enum, using string

**Solution:**
- Ensure seed.ts imports: `import { RoleType } from '@prisma/client'`
- Use: `name: RoleType.SUPER_ADMIN` not `name: 'SUPER_ADMIN'`
- Regenerate Prisma Client: `npx prisma generate`

### Issue: Soft delete not working

**Symptoms:** Records actually deleted instead of soft-deleted

**Solution:**
- Verify middleware registered in PrismaService.onModuleInit()
- Check import: `import { softDeleteMiddleware } from './soft-delete.middleware'`
- Verify model in SOFT_DELETE_MODELS array
- Restart application

---

## Performance Testing

### 1. Test Index Usage

```sql
-- Enable query timing
\timing on

-- Test query without index (should use index now)
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM users 
WHERE email = 'admin@buildingmanager.com' 
  AND is_active = true
  AND deleted_at IS NULL;

-- Should show: Index Scan using idx_users_email_active
-- Execution time should be < 1ms

-- Test composite index on expenses
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM expenses
WHERE building_id = 'some-uuid'
  AND is_paid = false
  AND deleted_at IS NULL;

-- Should show: Index Scan using idx_expenses_building_paid
```

### 2. Monitor Index Usage

```sql
-- Check index hit rates after 1 week
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;

-- Indexes with idx_scan = 0 are unused and can be removed
```

---

## Next Steps

1. ✅ **Migration Complete** - Schema enhanced with enums, soft deletes, indexes
2. ⏭️ **Implement Remaining Modules**:
   - Expenses module (CRUD with categories/suppliers)
   - Oil Management module (deliveries/measurements)
   - Common Charges module (period calculations)
   - Documents module (file upload)
   - Payments module (recording/tracking)
3. ⏭️ **Add Monitoring**:
   - Index usage tracking
   - Query performance metrics
   - Slow query logging
4. ⏭️ **Data Retention Policy**:
   - Schedule permanent deletion of old soft-deleted records
   - Implement `permanentlyDeleteOld()` cron job

---

## References

- [Prisma Schema Documentation](https://www.prisma.io/docs/concepts/components/prisma-schema)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Enum Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Full design documentation
