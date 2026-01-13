# Building Manager API - Setup Guide

## Τι Δημιουργήθηκε

### 1. **Project Structure**
```
BuildingManager/
├── src/
│   ├── auth/              # JWT Authentication & Authorization
│   ├── users/             # User & Role Management
│   ├── buildings/         # Buildings & Apartments
│   ├── expenses/          # Expense Tracking (stub)
│   ├── oil-management/    # Oil Deliveries & Measurements (stub)
│   ├── common-charges/    # Common Charges Calculation (stub)
│   ├── documents/         # Document Management (stub)
│   ├── audit-log/         # Audit Trail (stub)
│   ├── common/            # Shared decorators & enums
│   └── prisma/            # Database service
├── prisma/
│   ├── schema.prisma      # Complete database schema
│   └── seed.ts            # Initial data seeding
├── docker-compose.yml     # PostgreSQL container
└── Configuration files
```

### 2. **Implemented Modules (Fully Functional)**

#### **Auth Module**
- ✅ JWT-based authentication
- ✅ Register endpoint: `POST /api/v1/auth/register`
- ✅ Login endpoint: `POST /api/v1/auth/login`
- ✅ Role-based access control (RBAC)
- ✅ Building-scoped permissions

#### **Users Module**
- ✅ CRUD operations for users
- ✅ Role assignment (global & building-scoped)
- ✅ User listing by building
- ✅ Audit logging on all operations

**Endpoints:**
- `POST /api/v1/users` - Create user (SUPER_ADMIN only)
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user details
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `POST /api/v1/users/:id/roles` - Assign role
- `DELETE /api/v1/users/:userId/roles/:roleId` - Remove role
- `GET /api/v1/users/building/:buildingId` - Get users by building

#### **Buildings Module**
- ✅ Building CRUD operations
- ✅ Apartment CRUD operations
- ✅ Share percentage validation (total ≤ 100%)
- ✅ Owner assignment
- ✅ Audit logging

**Endpoints:**
- `POST /api/v1/buildings` - Create building (SUPER_ADMIN)
- `GET /api/v1/buildings` - List all buildings
- `GET /api/v1/buildings/:id` - Get building with apartments
- `PATCH /api/v1/buildings/:id` - Update building
- `DELETE /api/v1/buildings/:id` - Delete building
- `POST /api/v1/buildings/apartments` - Create apartment
- `GET /api/v1/buildings/apartments/all` - List apartments
- `GET /api/v1/buildings/apartments/:id` - Get apartment details
- `PATCH /api/v1/buildings/apartments/:id` - Update apartment
- `DELETE /api/v1/buildings/apartments/:id` - Delete apartment

### 3. **Database Schema**

**Complete Prisma schema με:**
- ✅ Users & Roles (με building scope)
- ✅ Buildings & Apartments
- ✅ Expenses & Categories
- ✅ Suppliers
- ✅ Oil Deliveries & Measurements
- ✅ Common Charge Periods & Lines
- ✅ Payments
- ✅ Documents
- ✅ Events & Reminders
- ✅ Announcements & Comments
- ✅ Audit Logs

### 4. **Security & RBAC**

**Τρεις ρόλοι:**
- **SUPER_ADMIN**: Full system access (global scope)
- **BUILDING_ADMIN**: Full access σε συγκεκριμένη πολυκατοικία
- **READ_ONLY**: Read-only access σε συγκεκριμένη πολυκατοικία

**Guards:**
- `JwtAuthGuard`: Επαληθεύει JWT token
- `RolesGuard`: Ελέγχει permissions βάσει ρόλου

**Decorators:**
- `@Roles(RoleName.SUPER_ADMIN)`: Περιορίζει access
- `@CurrentUser()`: Επιστρέφει authenticated user

### 5. **Audit Trail**

Όλες οι κρίσιμες ενέργειες καταγράφονται:
- User creation/update/deletion
- Role assignments
- Building & apartment changes
- Login events

---

## Επόμενα Βήματα

### Άμεσα (για να τρέξει η εφαρμογή):

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d postgres
   ```

3. **Run migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Seed database:**
   ```bash
   npm run prisma:seed
   ```
   Δημιουργεί:
   - Super Admin (admin@buildingmanager.com / Admin123!)
   - 3 Roles (SUPER_ADMIN, BUILDING_ADMIN, READ_ONLY)
   - 10 Expense Categories

5. **Start development server:**
   ```bash
   npm run start:dev
   ```

6. **Test API:**
   ```bash
   # Login
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@buildingmanager.com","password":"Admin123!"}'
   
   # Use the returned token in subsequent requests
   # Authorization: Bearer <token>
   ```

### Μελλοντική Υλοποίηση (MVP):

**Phase 2 - Expenses:**
- Expense CRUD operations
- Category management
- Supplier management
- Invoice tracking

**Phase 3 - Oil Management:**
- Oil delivery recording
- Meter readings per apartment
- Cost allocation

**Phase 4 - Common Charges:**
- Period creation & locking
- Charge calculation (base + oil + water + other)
- Per-apartment breakdown
- PDF generation

**Phase 5 - Documents:**
- File upload (multer)
- Association with expenses/deliveries
- Download & preview

**Phase 6 - Payments:**
- Payment recording
- Balance tracking
- Payment history

---

## Αρχιτεκτονικές Αποφάσεις

### 1. **Prisma vs TypeORM**
Επέλεξα **Prisma** για:
- Type-safe queries
- Εύκολο migration management
- Auto-generated types
- Καλύτερο DevX

### 2. **Building-Scoped Roles**
Το `UserRole` model έχει optional `buildingId`:
- `null` → Global role (SUPER_ADMIN μόνο)
- `UUID` → Building-specific role (BUILDING_ADMIN, READ_ONLY)

### 3. **Audit Logging**
Κάθε critical operation δημιουργεί AuditLog entry με:
- User που έκανε την ενέργεια
- Entity type & ID
- Changes (JSON με before/after)
- Timestamp & IP (προαιρετικά)

### 4. **Share Percentage Validation**
Κατά τη δημιουργία/update apartment:
- Υπολογίζει το σύνολο των ποσοστών
- Αποτρέπει υπέρβαση του 100%
- Επιτρέπει ευελιξία (δεν απαιτεί ακριβώς 100%)

### 5. **Soft Delete**
Δεν υλοποιήθηκε ακόμα, αλλά μπορεί να προστεθεί με:
```prisma
deletedAt DateTime?
```

---

## Production Considerations

### Πριν το Production:

1. **Environment Variables:**
   - Αλλαγή `JWT_SECRET` σε ισχυρό random string
   - Secure database credentials
   - HTTPS-only cookies

2. **Database:**
   - Connection pooling
   - Backup strategy
   - Migration rollback plan

3. **File Uploads:**
   - S3/Cloud storage αντί local filesystem
   - File size limits
   - Virus scanning

4. **Rate Limiting:**
   - Προστασία από brute force attacks
   - API rate limiting

5. **Logging:**
   - Structured logging (Winston/Pino)
   - Error tracking (Sentry)
   - Performance monitoring

6. **Tests:**
   - Unit tests για services
   - E2E tests για critical flows
   - Integration tests

---

## Χρήση API

### Login & Get Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@buildingmanager.com","password":"Admin123!"}'
```

### Create Building
```bash
curl -X POST http://localhost:3000/api/v1/buildings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Πολυκατοικία Κολωνακίου",
    "address": "Σκουφά 12",
    "city": "Αθήνα",
    "postalCode": "10673",
    "apartmentCount": 8,
    "floors": 4
  }'
```

### Create Apartment
```bash
curl -X POST http://localhost:3000/api/v1/buildings/apartments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "buildingId": "<building-id>",
    "number": "1A",
    "floor": 1,
    "squareMeters": 85,
    "sharePercentage": 12.5
  }'
```
