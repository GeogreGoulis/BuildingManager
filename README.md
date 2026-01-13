# Building Manager API

Multi-building management system built with NestJS and PostgreSQL.

## Quick Links

📚 **Documentation:**
- [Quick Start Guide](./QUICKSTART.md) - Get running in 5 minutes
- [Setup Guide](./SETUP.md) - Detailed installation instructions
- [Database Architecture](./DATABASE_ARCHITECTURE.md) - Complete schema documentation (8000+ lines)
- [Database Summary](./DATABASE_SUMMARY.md) - Schema statistics & quick reference
- [Migration Guide](./MIGRATION_GUIDE.md) - How to apply schema changes

📁 **Examples:**
- [Migration Examples](./migrations/examples/) - SQL patterns for common migrations
- [Rollback Strategies](./migrations/examples/ROLLBACK_STRATEGIES.md) - Safe rollback procedures

## Features

✅ **Implemented:**
- JWT Authentication with Role-Based Access Control (RBAC)
- User Management (CRUD, role assignment, building-scoped permissions)
- Building & Apartment Management (CRUD, share percentages, owner assignment)
- Comprehensive Audit Trail (all operations logged)
- Soft Delete Support (13 models with recoverable deletion)
- Production-Ready Schema:
  - 6 Type-Safe Enums (RoleType, PaymentMethod, DocumentCategory, etc.)
  - 47 Optimized Indexes (single + composite)
  - Enhanced AuditLog (oldValue/newValue tracking)

🚧 **In Progress:**
- Expenses Module (categories, suppliers, invoice tracking)
- Oil Management Module (deliveries, measurements, cost allocation)
- Common Charges Module (period management, calculations)
- Documents Module (file upload, entity associations)
- Payments Module (payment recording, balance tracking)

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+

## Getting Started

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your configuration.

### 3. Start Database

```bash
docker-compose up -d postgres
```

### 4. Run Migrations

```bash
# Generate migration from schema
npx prisma migrate dev --name enhanced-schema-v2

# Or reset database (DEV ONLY - deletes all data)
npx prisma migrate reset
```

### 5. Seed Database

```bash
npx prisma db seed
```

**Default Credentials:**
- Email: `admin@buildingmanager.com`
- Password: `Admin123!`

### 6. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

### 7. Test API

```bash
# Login and get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@buildingmanager.com",
    "password": "Admin123!"
  }'

# Use token for authenticated requests
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

For detailed testing examples, see [QUICKSTART.md](./QUICKSTART.md).

## Available Scripts

- `npm run start:dev` - Start development server with hot reload
- `npm run start:prod` - Start production server
- `npm run build` - Build the application
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with initial data

## Project Structure

```
src/
├── auth/              # Authentication & authorization
│   ├── guards/        # JWT & Roles guards
│   ├── strategies/    # Passport JWT strategy
│   └── dto/           # Login/register DTOs
├── users/             # User management
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/           # User DTOs
├── buildings/         # Buildings & apartments
│   ├── buildings.controller.ts
│   ├── buildings.service.ts
│   └── dto/           # Building/apartment DTOs
├── expenses/          # Expense tracking (stub)
├── oil-management/    # Oil delivery & measurements (stub)
├── common-charges/    # Common charges calculation (stub)
├── documents/         # Document management (stub)
├── audit-log/         # Audit trail (stub)
├── prisma/            # Database service
│   ├── prisma.service.ts
│   └── soft-delete.middleware.ts
└── common/
    ├── decorators/    # Custom decorators (@Roles, @CurrentUser)
    └── enums/         # RBAC enums

prisma/
├── schema.prisma      # Database schema (19 models, 6 enums)
├── migrations/        # Migration history
│   └── examples/      # SQL migration examples
└── seed.ts           # Initial data seeding

docs/
├── DATABASE_ARCHITECTURE.md  # Comprehensive design documentation
├── DATABASE_SUMMARY.md       # Quick reference & statistics
└── MIGRATION_GUIDE.md        # Migration procedures
```

## Database Schema

### Models (19 total):
1. **User Management:** User, Role, UserRole
2. **Property:** Building, Apartment
3. **Financial:** ExpenseCategory, Supplier, Expense, OilDelivery, OilMeasurement, CommonChargePeriod, CommonChargeLine, Payment
4. **Documents:** Document, Event, Reminder, Announcement, Comment
5. **System:** AuditLog

### Key Features:
- **UUIDs:** All primary keys for global uniqueness
- **Soft Deletes:** 13 models with `deletedAt` field (recoverable deletion)
- **Type-Safe Enums:** RoleType, PaymentMethod, DocumentCategory, EventType, AnnouncementPriority, AuditAction
- **Optimized Indexes:** 47 indexes (28 single-column + 19 composite)
- **Referential Integrity:** Strategic ON DELETE behaviors (CASCADE/RESTRICT/SET NULL)
- **Audit Trail:** Comprehensive logging with oldValue/newValue tracking

For complete schema documentation, see [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md).

## Tech Stack

- **Framework:** NestJS 10.3.0
- **Database:** PostgreSQL 16 (Alpine)
- **ORM:** Prisma 5.8.0
- **Authentication:** JWT with passport-jwt
- **Authorization:** Role-Based Access Control (RBAC)
- **Validation:** class-validator, class-transformer
- **Language:** TypeScript 5.3.3 (strict mode)
- **Password Hashing:** bcrypt
- **File Upload:** multer

## Authentication & Authorization

### Roles:
- **SUPER_ADMIN:** Global access to all buildings and system settings
- **BUILDING_ADMIN:** Full access to assigned building(s)
- **READ_ONLY:** View-only access to assigned building(s)

### Building-Scoped Permissions:
Users can have different roles for different buildings:
```typescript
// User A is BUILDING_ADMIN for Building 1
// User A is READ_ONLY for Building 2
```

### Protected Endpoints:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleType.SUPER_ADMIN, RoleType.BUILDING_ADMIN)
async createBuilding() {
  // Only SUPER_ADMIN and BUILDING_ADMIN can create buildings
}
```

## Soft Delete

The system uses soft delete for 13 models (User, Building, Expense, etc.):

```typescript
// Soft delete (sets deletedAt timestamp)
await prisma.user.delete({ where: { id } });

// Force hard delete
await prisma.user.delete({ where: { id }, forceDelete: true });

// Restore soft-deleted record
await restoreSoftDeleted(prisma.user, { id });

// Query only deleted records
const deleted = await findDeleted(prisma.user, {});
```

Soft-deleted records are automatically filtered from queries but remain in database for audit/recovery.

## Development

### Database Management:

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# View database with psql
docker exec -it building-manager-postgres psql -U postgres -d building_manager

# Backup database
docker exec building-manager-postgres pg_dump -U postgres building_manager > backup.sql

# Restore database
docker exec -i building-manager-postgres psql -U postgres -d building_manager < backup.sql
```

### Code Quality:

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run build
```

### Testing:

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Deployment

### Build Production:

```bash
npm run build
npm run start:prod
```

### Environment Variables:

See [.env.example](./.env.example) for required configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRATION` - Token expiration time
- `PORT` - API server port
- `NODE_ENV` - Environment (development/production)

### Docker Deployment:

```bash
# Build image
docker build -t building-manager-api .

# Run container
docker run -p 3000:3000 --env-file .env building-manager-api
```

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[SETUP.md](./SETUP.md)** - Detailed installation & configuration
- **[DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md)** - Complete schema design (8000+ lines):
  - Design decisions & rationale
  - Index strategy & query patterns
  - Risk analysis & mitigations
  - Performance considerations
  - Maintenance schedule
  - GDPR compliance
- **[DATABASE_SUMMARY.md](./DATABASE_SUMMARY.md)** - Quick reference:
  - Model statistics
  - Enum definitions
  - Relationship matrix
  - Index listing
  - Query patterns
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Migration procedures:
  - Pre-migration checklist
  - Step-by-step instructions
  - Verification queries
  - Rollback strategies
  - Troubleshooting

## License

UNLICENSED
