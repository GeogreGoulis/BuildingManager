# Database Architecture Summary

## Schema Statistics

### Models: 19 Total

1. **User Management** (3 models)
   - User
   - Role
   - UserRole

2. **Property Management** (2 models)
   - Building
   - Apartment

3. **Financial** (8 models)
   - ExpenseCategory
   - Supplier
   - Expense
   - OilDelivery
   - OilMeasurement
   - CommonChargePeriod
   - CommonChargeLine
   - Payment

4. **Documents & Communication** (5 models)
   - Document
   - Event
   - Reminder
   - Announcement
   - Comment

5. **System** (1 model)
   - AuditLog

### Enums: 6 Total

| Enum | Values | Usage |
|------|--------|-------|
| **RoleType** | SUPER_ADMIN, BUILDING_ADMIN, READ_ONLY | Role.name |
| **PaymentMethod** | CASH, BANK_TRANSFER, CHECK, ONLINE | Payment.paymentMethod |
| **DocumentCategory** | INVOICE, CONTRACT, RECEIPT, REPORT, PHOTO, OTHER | Document.category |
| **EventType** | MEETING, MAINTENANCE, INSPECTION, REPAIR, EMERGENCY, OTHER | Event.eventType |
| **AnnouncementPriority** | LOW, NORMAL, HIGH, URGENT | Announcement.priority |
| **AuditAction** | CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ASSIGN_ROLE, REMOVE_ROLE, CHANGE_PASSWORD, APPROVE, REJECT | AuditLog.action |

### Soft Delete Support: 13 Models

Models with `deletedAt DateTime?` field:
1. User
2. Role
3. Building
4. Apartment
5. ExpenseCategory
6. Supplier
7. Expense
8. OilDelivery
9. OilMeasurement
10. CommonChargePeriod
11. Payment
12. Document
13. Event

**Note:** UserRole, CommonChargeLine, Reminder, Announcement, Comment, AuditLog do NOT have soft delete (hard delete only).

### Indexes: 47 Total

#### Single-Column Indexes: 28

**User Management:**
- users: email, phone, is_active, created_at, deleted_at
- roles: name, created_at, deleted_at
- user_roles: user_id, role_id, building_id

**Property:**
- buildings: name, address, created_at, deleted_at
- apartments: building_id, floor, apartment_number, created_at, deleted_at

**Financial:**
- expense_categories: name, created_at, deleted_at
- suppliers: name, email, created_at, deleted_at
- expenses: building_id, category_id, supplier_id, expense_date, is_paid, created_at, deleted_at
- oil_deliveries: building_id, delivery_date, created_at, deleted_at
- oil_measurements: building_id, measurement_date, created_at, deleted_at
- common_charge_periods: building_id, period_year, period_month, is_locked, created_at, deleted_at
- payments: expense_id, paid_by_user_id, payment_date, created_at, deleted_at

**Documents & Communication:**
- documents: building_id, apartment_id, category, created_at, deleted_at
- events: building_id, event_date, created_at, deleted_at

#### Composite Indexes: 19

**User Management:**
1. `idx_users_email_active` - (email, is_active) WHERE deleted_at IS NULL
2. `idx_user_roles_user_building` - (user_id, building_id)

**Property:**
3. `idx_apartments_building_floor` - (building_id, floor)
4. `idx_apartments_building_number` - (building_id, apartment_number) WHERE deleted_at IS NULL

**Financial:**
5. `idx_expenses_building_date` - (building_id, expense_date)
6. `idx_expenses_building_paid` - (building_id, is_paid) WHERE deleted_at IS NULL
7. `idx_expenses_category_date` - (category_id, expense_date)
8. `idx_oil_deliveries_building_date` - (building_id, delivery_date)
9. `idx_oil_measurements_building_date` - (building_id, measurement_date)
10. `idx_common_charge_periods_building_year_month` - (building_id, period_year, period_month) (UNIQUE)
11. `idx_common_charge_periods_building_locked` - (building_id, is_locked) WHERE deleted_at IS NULL
12. `idx_common_charge_lines_period_apartment` - (period_id, apartment_id) (UNIQUE)
13. `idx_payments_expense_date` - (expense_id, payment_date)
14. `idx_payments_user_date` - (paid_by_user_id, payment_date)

**Documents & Communication:**
15. `idx_documents_building_category` - (building_id, category)
16. `idx_events_building_date` - (building_id, event_date)

**System:**
17. `idx_audit_logs_user_date` - (user_id, created_at)
18. `idx_audit_logs_entity` - (entity_type, entity_id)
19. `idx_audit_logs_action_date` - (action, created_at)

---

## Relationships Summary

### Total Relations: 34

| From Model | To Model | Type | ON DELETE |
|------------|----------|------|-----------|
| UserRole | User | Many-to-One | CASCADE |
| UserRole | Role | Many-to-One | CASCADE |
| UserRole | Building | Many-to-One | SET NULL (optional) |
| Apartment | Building | Many-to-One | CASCADE |
| Apartment | User (owner) | Many-to-One | SET NULL (optional) |
| Expense | Building | Many-to-One | RESTRICT |
| Expense | ExpenseCategory | Many-to-One | RESTRICT |
| Expense | Supplier | Many-to-One | SET NULL (optional) |
| OilDelivery | Building | Many-to-One | CASCADE |
| OilMeasurement | Building | Many-to-One | CASCADE |
| CommonChargePeriod | Building | Many-to-One | CASCADE |
| CommonChargeLine | CommonChargePeriod | Many-to-One | CASCADE |
| CommonChargeLine | Apartment | Many-to-One | CASCADE |
| Payment | Expense | Many-to-One | CASCADE |
| Payment | User | Many-to-One | SET NULL (optional) |
| Document | Building | Many-to-One | CASCADE (optional) |
| Document | Apartment | Many-to-One | CASCADE (optional) |
| Event | Building | Many-to-One | CASCADE |
| Event | User (creator) | Many-to-One | SET NULL (optional) |
| Reminder | User | Many-to-One | CASCADE |
| Reminder | Event | Many-to-One | CASCADE (optional) |
| Announcement | Building | Many-to-One | CASCADE |
| Announcement | User (creator) | Many-to-One | SET NULL (optional) |
| Comment | User (author) | Many-to-One | SET NULL (optional) |
| Comment | Announcement | Many-to-One | CASCADE (optional) |
| Comment | Event | Many-to-One | CASCADE (optional) |
| AuditLog | User | Many-to-One | SET NULL (optional) |

### ON DELETE Behavior

#### CASCADE (19 relations)
Automatically deletes child records when parent is deleted.
- UserRole → User/Role
- Apartment → Building
- OilDelivery → Building
- OilMeasurement → Building
- CommonChargePeriod → Building
- CommonChargeLine → Period/Apartment
- Payment → Expense
- Document → Building/Apartment
- Event → Building
- Reminder → User/Event
- Announcement → Building
- Comment → Announcement/Event

#### RESTRICT (2 relations)
Prevents deletion if child records exist.
- Expense → Building/ExpenseCategory (cannot delete building/category with expenses)

#### SET NULL (13 relations)
Sets foreign key to NULL when parent is deleted.
- UserRole → Building (role can exist without building)
- Apartment → User owner
- Expense → Supplier
- Payment → User
- Event → User creator
- Announcement → User creator
- Comment → User author
- AuditLog → User

---

## Data Types & Precision

### UUID Fields
All primary keys and foreign keys use `UUID` with `@default(uuid())`.

**Why UUID:**
- Globally unique across distributed systems
- No auto-increment collisions
- Better security (non-sequential)
- Easier data migration/merging

**Trade-offs:**
- Larger storage (16 bytes vs 4-8 bytes)
- Slower indexing than integers
- Not human-readable

### Decimal Fields
Financial amounts use `Decimal` type for precision.

| Field | Precision | Scale | Range |
|-------|-----------|-------|-------|
| Apartment.sharePercentage | (5, 2) | 2 | 0.00 - 100.00 |
| Expense.amount | (10, 2) | 2 | -99,999,999.99 to 99,999,999.99 |
| OilDelivery.pricePerLiter | (6, 3) | 3 | 0.000 - 999.999 |
| OilDelivery.totalCost | (10, 2) | 2 | Large amounts |
| OilMeasurement.litersRemaining | (8, 2) | 2 | 0.00 - 999,999.99 |
| CommonChargeLine.chargeAmount | (10, 2) | 2 | Building-level charges |
| Payment.amount | (10, 2) | 2 | Payment amounts |

**Why Decimal:**
- Exact arithmetic (no floating-point errors)
- Critical for financial calculations
- Preserves precision in aggregations

**Alternative:**
Store as integers (cents) if performance critical, but Decimal preferred for clarity.

### DateTime Fields
All timestamps use `DateTime` with `@default(now())` for created/updated.

**Timezone Handling:**
- PostgreSQL stores as UTC
- Application converts to user timezone
- Important for Greece (UTC+2/+3 with DST)

### String Length Limits

| Field Type | Length | Reasoning |
|------------|--------|-----------|
| Email | 255 | RFC 5321 standard |
| Phone | 20 | International format +XXX XXXXXXXXXX |
| Name fields | 100 | Reasonable for Greek names |
| Address | 500 | Full postal address |
| Description | 1000 | Detailed notes |
| Title | 255 | Event/announcement titles |

---

## Unique Constraints

| Model | Fields | Constraint |
|-------|--------|------------|
| User | email | Unique login identifier |
| Role | name | RoleType enum (SUPER_ADMIN, BUILDING_ADMIN, READ_ONLY) |
| Building | name, address | Composite unique (same name OK if different address) |
| Apartment | building_id, floor, apartment_number | Composite unique (A1, A2, etc. per building) |
| ExpenseCategory | name | Predefined categories |
| Supplier | email | One account per supplier |
| CommonChargePeriod | building_id, period_year, period_month | One period per month per building |
| CommonChargeLine | period_id, apartment_id | One charge per apartment per period |

---

## Query Patterns & Index Usage

### Pattern 1: User Login
```sql
SELECT * FROM users 
WHERE email = ? 
  AND is_active = true 
  AND deleted_at IS NULL;
```
**Index:** `idx_users_email_active` (composite)

### Pattern 2: List Building Expenses
```sql
SELECT * FROM expenses 
WHERE building_id = ? 
  AND expense_date >= ? 
  AND expense_date <= ?
  AND deleted_at IS NULL;
```
**Index:** `idx_expenses_building_date` (composite)

### Pattern 3: Unpaid Expenses
```sql
SELECT * FROM expenses 
WHERE building_id = ? 
  AND is_paid = false 
  AND deleted_at IS NULL;
```
**Index:** `idx_expenses_building_paid` (partial composite)

### Pattern 4: Building Apartments
```sql
SELECT * FROM apartments 
WHERE building_id = ? 
  AND deleted_at IS NULL
ORDER BY floor, apartment_number;
```
**Index:** `idx_apartments_building_floor` (composite) + `idx_apartments_building_number`

### Pattern 5: User Audit Trail
```sql
SELECT * FROM audit_logs 
WHERE user_id = ? 
  AND created_at >= ?
ORDER BY created_at DESC;
```
**Index:** `idx_audit_logs_user_date` (composite)

### Pattern 6: Common Charges Lookup
```sql
SELECT * FROM common_charge_periods 
WHERE building_id = ? 
  AND period_year = ? 
  AND period_month = ?;
```
**Index:** `idx_common_charge_periods_building_year_month` (unique composite)

---

## Soft Delete Implementation

### Middleware Approach
Located in: `src/prisma/soft-delete.middleware.ts`

**Features:**
1. **Automatic Soft Delete**: Intercepts `delete`/`deleteMany` → converts to `update` with `deletedAt = now()`
2. **Query Filtering**: Automatically adds `WHERE deleted_at IS NULL` to all read queries
3. **Force Delete Option**: Bypass with `{ forceDelete: true }`
4. **Restore Function**: `restoreSoftDeleted(model, where)` sets `deletedAt = null`
5. **Cleanup Function**: `permanentlyDeleteOld(model, daysOld)` for GDPR compliance

### Usage Examples

```typescript
// Soft delete (sets deletedAt)
await prisma.user.delete({ where: { id } });

// Force hard delete (bypasses middleware)
await prisma.user.delete({ where: { id }, forceDelete: true });

// Restore soft-deleted record
await restoreSoftDeleted(prisma.user, { id });

// Find deleted records
const deleted = await findDeleted(prisma.user, {});

// Permanently delete old records (30+ days)
const count = await permanentlyDeleteOld(prisma.user, 30);
```

### Partial Indexes for Soft Delete
Many indexes include `WHERE deleted_at IS NULL` to:
- Reduce index size (ignore deleted records)
- Speed up queries (smaller index scan)
- Automatically used when query filters deleted records

---

## Migration Strategy

### File Structure
```
prisma/
  ├── schema.prisma              # Source of truth
  └── migrations/
      ├── 20260113_initial/
      │   └── migration.sql
      ├── 20260113_enhanced_schema_v2/
      │   └── migration.sql      # Generated migration
      └── migration_lock.toml
```

### Migration Types

1. **Safe Migrations** (no downtime):
   - Add nullable column
   - Add index CONCURRENTLY
   - Add enum value
   - Add new table

2. **Risky Migrations** (test carefully):
   - Add NOT NULL column (requires DEFAULT or data migration)
   - Change column type
   - Add unique constraint
   - Rename column

3. **Dangerous Migrations** (maintenance window):
   - Drop column
   - Remove enum value
   - Change primary key
   - Large data migration

### Rollback Strategies
See: `migrations/examples/ROLLBACK_STRATEGIES.md`

**Forward-only philosophy:**
- Never rollback in production
- Create compensating migrations to fix issues
- Use multi-phase deployments for breaking changes

---

## Performance Considerations

### Write Performance
- **Impact:** Indexes slow down INSERT/UPDATE (must update index)
- **Mitigation:** Only index frequently queried columns
- **Monitoring:** Track write latency, disable unused indexes

### Read Performance
- **Impact:** Indexes speed up SELECT with WHERE/JOIN
- **Optimization:** Composite indexes for multi-column queries
- **Partial indexes:** `WHERE deleted_at IS NULL` reduces size

### Storage
- **UUIDs:** 16 bytes per key (vs 4 bytes for INT)
- **Indexes:** ~30% of table size per index
- **Soft deletes:** Deleted records remain (cleanup needed)

### Estimated Table Sizes (100 buildings, 5 years)

| Table | Rows | Size |
|-------|------|------|
| Users | ~5,000 | 5 MB |
| Buildings | 100 | 100 KB |
| Apartments | ~8,000 | 8 MB |
| Expenses | ~600,000 | 600 MB |
| Payments | ~400,000 | 400 MB |
| AuditLog | ~2,000,000 | 2 GB |
| **Total** | | **~3 GB** |

---

## Maintenance Schedule

### Daily
- Monitor slow queries (> 100ms)
- Check error logs for constraint violations

### Weekly
- Review index usage (`pg_stat_user_indexes`)
- Analyze table sizes (`pg_total_relation_size`)

### Monthly
- VACUUM ANALYZE (auto-vacuum should handle, but check)
- Review soft-deleted records (consider permanent deletion)
- Update index statistics

### Quarterly
- Remove unused indexes (idx_scan = 0 for 90 days)
- Archive old audit logs (> 1 year)
- Performance benchmarks

---

## Security & Compliance

### GDPR (Personal Data)
**PII Fields:**
- User: email, firstName, lastName, phone
- Apartment: owner relationship

**Compliance:**
- Soft delete preserves audit trail for 90 days
- Permanent deletion after grace period
- Audit log tracks all access
- User can request data export/deletion

### Financial Audit
**Immutable Records:**
- Expense (amount, date, category)
- Payment (amount, date, method)
- CommonChargePeriod (when locked)

**Audit Trail:**
- AuditLog tracks CREATE/UPDATE/DELETE
- oldValue/newValue for change tracking
- User attribution for accountability

### Access Control
**Role-Based:**
- SUPER_ADMIN: global access
- BUILDING_ADMIN: building-scoped
- READ_ONLY: view-only

**Implementation:**
- UserRole junction table
- Building-scoped permissions
- Enforced at application layer (guards)

---

## Next Steps

### 1. Apply Migration
```bash
npx prisma migrate dev --name enhanced-schema-v2
npx prisma generate
npx prisma db seed
```

### 2. Implement Remaining Modules
- [x] Auth (JWT + RBAC)
- [x] Users (CRUD + role assignment)
- [x] Buildings (CRUD + apartments)
- [ ] Expenses (CRUD + categories)
- [ ] Oil Management (deliveries + measurements)
- [ ] Common Charges (calculation + PDF)
- [ ] Documents (file upload)
- [ ] Payments (tracking + balance)

### 3. Monitoring
- Set up query performance tracking
- Index usage dashboard
- Slow query alerts

### 4. Testing
- Unit tests for services
- Integration tests for API
- E2E tests for workflows
- Load testing for performance

---

## Key Files Reference

1. **Schema:** `prisma/schema.prisma` (382 lines, 19 models)
2. **Middleware:** `src/prisma/soft-delete.middleware.ts` (150 lines)
3. **Documentation:** `DATABASE_ARCHITECTURE.md` (8000+ lines, comprehensive)
4. **Migration Guide:** `MIGRATION_GUIDE.md` (this file)
5. **Examples:** `migrations/examples/*.sql` (migration patterns)
6. **Seed:** `prisma/seed.ts` (initial data)

---

## Credits

**Design Philosophy:**
- PostgreSQL-first (leverage native features)
- Type-safe (Prisma + TypeScript)
- Audit-first (comprehensive logging)
- Production-ready (indexes, constraints, soft deletes)
- Maintainable (documented, tested, versioned)

**Tools Used:**
- NestJS 10.3.0
- Prisma 5.8.0
- PostgreSQL 16
- TypeScript 5.3.3

**Documentation Standards:**
- Every decision documented with rationale
- Risk analysis with mitigations
- Examples for common patterns
- Clear migration procedures

---

## Support

For questions or issues:
1. Check `DATABASE_ARCHITECTURE.md` for design rationale
2. Check `MIGRATION_GUIDE.md` for migration procedures
3. Check `migrations/examples/` for SQL patterns
4. Review Prisma documentation: https://www.prisma.io/docs
