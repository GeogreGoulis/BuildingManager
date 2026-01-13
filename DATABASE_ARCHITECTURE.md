# Database Architecture Documentation

## Executive Summary

Enhanced PostgreSQL schema για Building Management System με:
- **19 Entities** με πλήρη referential integrity
- **Soft Deletes** σε όλες τις κρίσιμες οντότητες
- **Type-Safe Enums** για categorical data
- **40+ Indexes** για optimized queries
- **Comprehensive Audit Trail** με old/new value tracking

---

## Design Decisions & Rationale

### 1. **Primary Keys: UUIDs**

```prisma
id String @id @default(uuid())
```

**Pros:**
- Globally unique - εύκολη data migration μεταξύ environments
- Δεν αποκαλύπτουν business information (vs incremental IDs)
- Distributed system friendly
- Δεν χρειάζονται sequence locks

**Cons:**
- Μεγαλύτερα σε μέγεθος (36 chars vs 4-8 bytes)
- Λιγότερο human-readable
- Μικρή επίπτωση σε index performance

**Mitigation:**
- PostgreSQL UUID type είναι optimized (16 bytes internally)
- Composite indexes minimize performance impact

---

### 2. **Soft Deletes**

```prisma
deletedAt DateTime? // Soft delete
```

**Εφαρμόζεται σε:**
- User, Role, UserRole (compliance & audit)
- Building, Apartment (historical data)
- Expense, Payment (financial audit requirements)
- Document (legal retention)
- Announcement, Comment, Event, Reminder (user experience)

**Δεν εφαρμόζεται σε:**
- OilMeasurement (μετρήσεις δεν διαγράφονται, corrected)
- CommonChargeLine (συνδεδεμένη με Period)
- AuditLog (immutable by design)

**Implementation:**
```typescript
// Prisma middleware για auto soft-delete
prisma.$use(async (params, next) => {
  if (params.action === 'delete') {
    params.action = 'update';
    params.args['data'] = { deletedAt: new Date() };
  }
  return next(params);
});
```

---

### 3. **Enums vs Strings**

**Enums Defined:**
```prisma
enum RoleType { SUPER_ADMIN, BUILDING_ADMIN, READ_ONLY }
enum PaymentMethod { CASH, BANK_TRANSFER, CHECK, ONLINE }
enum DocumentCategory { INVOICE, CONTRACT, REPORT, PHOTO, OTHER }
enum EventType { MEETING, MAINTENANCE, INSPECTION, ASSEMBLY, OTHER }
enum AnnouncementPriority { LOW, NORMAL, HIGH, URGENT }
enum AuditAction { CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOCK, UNLOCK, APPROVE, REJECT }
```

**Benefits:**
- Type safety στο application layer
- Database constraints (invalid values rejected)
- Smaller storage (enum vs varchar)
- Self-documenting schema

**Tradeoff:**
- Enum changes require migration
- Solution: Πρόσθεση νέων values είναι backward compatible

---

### 4. **Indexes Strategy**

#### Single Column Indexes
```prisma
@@index([userId])      // FK lookups
@@index([buildingId])  // Scoping queries
@@index([isActive])    // Filtering
@@index([deletedAt])   // Soft delete queries
```

#### Composite Indexes
```prisma
@@index([buildingId, expenseDate])      // Building expenses by date
@@index([apartmentId, paymentDate])     // Apartment payment history
@@index([entity, action])               // Audit analytics
@@index([userId, isCompleted])          // User tasks
```

**Rationale:**
- Composite indexes για common WHERE + ORDER BY patterns
- Left-most prefix rule: `[buildingId, date]` serves both `buildingId` και `buildingId + date`

**Monitoring:**
```sql
-- Unused indexes (run quarterly)
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE '%_pkey';
```

---

### 5. **ON DELETE Behavior**

| Relationship | Behavior | Rationale |
|-------------|----------|-----------|
| Building → Apartment | CASCADE | Apartment δεν έχει νόημα χωρίς Building |
| Apartment → Payment | CASCADE | Payment history ανήκει σε apartment |
| User → Apartment (owner) | SET NULL | Apartment μπορεί να μην έχει owner |
| Expense → Supplier | SET NULL | Expense υπάρχει ακόμα αν διαγραφεί supplier |
| User → AuditLog | SET NULL | Audit trails διατηρούνται ακόμα κι αν διαγραφεί user |

**Critical:** Soft deletes προστατεύουν από accidental data loss.

---

### 6. **AuditLog Enhanced Structure**

```prisma
model AuditLog {
  action    AuditAction  // Enum αντί για string
  entity    String       // "Expense", "Payment", etc.
  entityId  String?      // PK του entity
  oldValue  Json?        // Before state
  newValue  Json?        // After state
  metadata  Json?        // IP, user agent, request context
}
```

**Usage Patterns:**

**CREATE:**
```json
{
  "action": "CREATE",
  "entity": "Expense",
  "entityId": "uuid",
  "oldValue": null,
  "newValue": { "amount": 100, "description": "..." }
}
```

**UPDATE:**
```json
{
  "action": "UPDATE",
  "entity": "Expense",
  "entityId": "uuid",
  "oldValue": { "amount": 100 },
  "newValue": { "amount": 150 }
}
```

**DELETE (Soft):**
```json
{
  "action": "DELETE",
  "entity": "Expense",
  "entityId": "uuid",
  "oldValue": { "amount": 150, "description": "..." },
  "newValue": { "deletedAt": "2026-01-13T..." }
}
```

---

### 7. **Decimal Precision**

```prisma
amount Decimal @db.Decimal(10, 2)  // Max: 99,999,999.99
sharePercentage Decimal @db.Decimal(5, 4)  // Max: 99.9999%
pricePerLiter Decimal @db.Decimal(6, 3)  // Max: 999.999
```

**Why Decimal not Float:**
- Financial data requires exact precision
- Float has rounding errors: `0.1 + 0.2 ≠ 0.3`
- PostgreSQL NUMERIC type is exact

---

### 8. **Unique Constraints**

```prisma
@@unique([buildingId, number])      // Apartment number unique per building
@@unique([buildingId, name])        // Period name unique per building
@@unique([userId, roleId, buildingId])  // Role assignment
@@unique([periodId, apartmentId])   // One charge line per apartment/period
```

**Business Rules Enforced:**
- Δεν μπορούν 2 apartments να έχουν το ίδιο number στο ίδιο building
- Δεν μπορεί user να έχει τον ίδιο role 2 φορές στο ίδιο building

---

## Schema Statistics

| Category | Count |
|----------|-------|
| Total Models | 19 |
| Enums | 6 |
| Total Indexes | 47 |
| Soft Deletable | 13 |
| Auditable | 7 (Expense, Payment, CommonChargePeriod, etc.) |
| Relationships | 31 |

---

## Risks & Mitigations

### Risk 1: Soft Delete Query Performance
**Issue:** Queries πρέπει να φιλτράρουν `WHERE deletedAt IS NULL`

**Mitigation:**
- Partial index: `CREATE INDEX ON users (id) WHERE deletedAt IS NULL;`
- Prisma middleware αυτόματα προσθέτει το filter
- Regular cleanup job για old soft-deleted records

### Risk 2: Enum Changes Breaking Production
**Issue:** Αλλαγή enum value χρειάζεται migration που μπορεί να κολλήσει

**Mitigation:**
- Πάντα προσθήκη, ποτέ rename/delete
- Deprecate strategy: προσθήκη `_DEPRECATED` suffix
- Multi-step migration για renames

### Risk 3: Index Bloat
**Issue:** Πολλά indexes = slower writes, μεγαλύτερο storage

**Mitigation:**
- Quarterly review με `pg_stat_user_indexes`
- Remove unused indexes
- Composite indexes αντί για πολλαπλά single-column

### Risk 4: JSON Query Performance
**Issue:** `Json` fields (AuditLog.oldValue) δεν έχουν indexes

**Mitigation:**
```sql
-- GIN index για JSON queries (if needed)
CREATE INDEX idx_audit_old_value_gin ON audit_logs USING GIN (old_value);
```

### Risk 5: Decimal Precision Limits
**Issue:** `Decimal(10, 2)` max = 99,999,999.99

**Mitigation:**
- Επαρκές για Ελληνική αγορά
- Monitoring για edge cases
- Easy migration αν χρειαστεί αλλαγή

---

## Query Patterns & Index Usage

### Pattern 1: Building Expenses by Date Range
```sql
SELECT * FROM expenses 
WHERE building_id = ? 
  AND expense_date BETWEEN ? AND ?
  AND deleted_at IS NULL
ORDER BY expense_date DESC;
```
**Index Used:** `[buildingId, expenseDate]`

### Pattern 2: User Activity Audit
```sql
SELECT * FROM audit_logs
WHERE user_id = ?
  AND created_at >= ?
ORDER BY created_at DESC
LIMIT 100;
```
**Index Used:** `[userId, createdAt]`

### Pattern 3: Unpaid Common Charges
```sql
SELECT * FROM common_charge_lines
WHERE period_id = ?
  AND is_paid = false;
```
**Index Used:** `[periodId]`, secondary filter on `isPaid`

---

## Migration Examples

See: `/migrations/examples/`

1. **baseline-schema.sql** - Initial migration
2. **add-column-expense-tags.sql** - Add new column
3. **add-enum-value-payment-method.sql** - Extend enum
4. **add-composite-index.sql** - Performance optimization
5. **rollback-strategies.sql** - Safe rollback patterns

---

## Performance Considerations

### Write Performance
- **Indexes:** ~5-10% overhead per index
- **Soft Deletes:** Negligible (UPDATE vs DELETE similar cost)
- **Audit Logs:** Async write recommended για high-volume

### Read Performance
- **Indexes:** 10-1000x speedup for filtered queries
- **Soft Delete Filter:** ~2-5% overhead with partial indexes
- **JSON Fields:** Linear scan unless GIN indexed

### Storage
- **Indexes:** ~30-50% of table size
- **Soft Deletes:** Grows over time, plan cleanup strategy
- **Audit Logs:** Largest table, consider partitioning after 10M rows

---

## Maintenance Recommendations

### Daily
- Monitor slow queries (`pg_stat_statements`)
- Check replication lag (if applicable)

### Weekly
- ANALYZE tables for query planner stats
- Review AuditLog growth rate

### Monthly
- VACUUM FULL on heavily updated tables
- Review and optimize slow queries

### Quarterly
- Remove unused indexes
- Archive old AuditLogs (>1 year)
- Review soft-deleted records cleanup

---

## Compliance & Data Retention

### GDPR Compliance
- User data can be fully deleted (soft delete then purge)
- AuditLog retains user actions but allows user anonymization
- Right to be forgotten: User.deletedAt + scheduled purge

### Financial Audit
- Expense, Payment, CommonCharge: 7 year retention
- AuditLog: Minimum 5 years for financial entities

---

## Next Steps

1. ✅ Generate migration from enhanced schema
2. ⚠️ Update seed data for enum values
3. ⚠️ Implement soft delete middleware
4. ⚠️ Add partial indexes for deletedAt
5. ⚠️ Create AuditLog helper service
6. ⚠️ Set up backup strategy
7. ⚠️ Configure monitoring & alerting

---

**Schema Version:** 2.0  
**Last Updated:** 2026-01-13  
**Database Architect:** Senior Backend Engineer
