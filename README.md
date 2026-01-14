# Building Manager - Διαχείριση Κοινοχρήστων Πολυκατοικίας

A comprehensive building management system for Greek apartment buildings (πολυκατοικίες). Manages common charges (κοινόχρηστα), expenses, payments, documents, and tenant communications.

## 🎯 Business Purpose

This system automates the calculation and management of **κοινόχρηστα** (common charges) for apartment buildings in Greece. It handles:
- Expense tracking and categorization
- Proportional distribution based on ownership shares (χιλιοστά)
- Payment recording and balance tracking
- Document management for invoices and contracts
- Building-wide announcements and communications

---

## 📋 Table of Contents

1. [Business Requirements](#-business-requirements)
2. [Technical Architecture](#-technical-architecture)
3. [Database Schema](#-database-schema)
4. [API Endpoints](#-api-endpoints)
5. [Frontend Features](#-frontend-features)
6. [Installation & Setup](#-installation--setup)
7. [Development Guide](#-development-guide)
8. [Business Rules](#-business-rules)

---

## 📊 Business Requirements

### Core Entities

| Entity | Greek Name | Purpose |
|--------|------------|---------|
| Building | Πολυκατοικία | The apartment building with settings |
| Apartment | Διαμέρισμα | Individual unit with ownership shares |
| Expense | Έξοδο | Costs to be distributed among apartments |
| ExpenseCategory | Κατηγορία Εξόδου | Determines distribution method |
| CommonChargePeriod | Περίοδος Κοινοχρήστων | Monthly billing period |
| Payment | Πληρωμή | Payments received from tenants |
| Document | Έγγραφο | Invoices, contracts, photos |
| Announcement | Ανακοίνωση | Building-wide communications |

### User Roles (RBAC)

| Role | Greek | Permissions |
|------|-------|-------------|
| SUPER_ADMIN | Διαχειριστής Συστήματος | Full access to all buildings |
| BUILDING_ADMIN | Διαχειριστής Πολυκατοικίας | Full access to assigned buildings |
| READ_ONLY | Ανάγνωση Μόνο | View-only access |

### Ownership Shares (Χιλιοστά)

Each apartment has multiple share percentages:
- **shareCommon** - General expenses (γενικά χιλιοστά)
- **shareElevator** - Elevator expenses (ανελκυστήρας)
- **shareHeating** - Heating expenses (θέρμανση)
- **shareOther** - Other expenses (λοιπά)

### Expense Distribution Methods

| Method | Greek | Description |
|--------|-------|-------------|
| GENERAL_SHARE | Γενικά Χιλιοστά | Distributed by shareCommon |
| HEATING_SHARE | Χιλιοστά Θέρμανσης | Distributed by shareHeating |
| CONSUMPTION_BASED | Κατανάλωση | Based on actual usage (oil, water) |
| EQUAL_SPLIT | Ίση Κατανομή | Divided equally among apartments |
| DIRECT_CHARGE | Άμεση Χρέωση | 100% to specific apartment |

### Expense Charge Types

Expenses can be charged in two ways:
- **Κοινόχρηστο** (Shared): Distributed among all apartments by shares
- **Χρέωση σε διαμέρισμα** (Direct): 100% charged to a specific apartment

---

## 🏗 Technical Architecture

### Tech Stack

**Backend:**
- **NestJS 10.3** - Node.js framework
- **PostgreSQL 16** - Database
- **Prisma 5.22** - ORM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Puppeteer** - PDF generation
- **Handlebars** - PDF templates
- **TypeScript 5.3** - Language

**Frontend:**
- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Query (TanStack)** - Data fetching
- **React Router** - Navigation
- **TypeScript** - Language

**Infrastructure:**
- **Docker Compose** - Container orchestration
- **Node 20** - Runtime

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐   │
│  │Dashboard│ │Expenses │ │Payments │ │CommonCharges│   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └──────┬──────┘   │
└───────┼───────────┼───────────┼─────────────┼──────────┘
        │           │           │             │
        ▼           ▼           ▼             ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (REST)                     │
│                   http://localhost:3000                  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                    NestJS Backend                        │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │   Auth   │ │   Expenses   │ │  CommonCharges   │    │
│  │  Module  │ │    Module    │ │     Module       │    │
│  └────┬─────┘ └──────┬───────┘ └────────┬─────────┘    │
│       │              │                   │              │
│       ▼              ▼                   ▼              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Prisma ORM Service                  │   │
│  │         (Soft Delete Middleware)                 │   │
│  └──────────────────────┬──────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL Database                         │
│              (19 Tables, 7 Enums)                        │
└─────────────────────────────────────────────────────────┘
```

### Project Structure

```
BuildingManager/
├── src/                          # Backend source
│   ├── main.ts                   # Application entry
│   ├── app.module.ts             # Root module
│   ├── auth/                     # Authentication
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── guards/               # JWT, Roles guards
│   │   └── strategies/           # Passport JWT strategy
│   ├── buildings/                # Buildings & Apartments
│   ├── expenses/                 # Expense management
│   ├── common-charges/           # Period & calculation
│   │   ├── common-charges.controller.ts
│   │   ├── common-charges.service.ts
│   │   ├── common-charges-calculation.service.ts  # Pure calculation
│   │   ├── common-charges-persistence.service.ts  # Database ops
│   │   └── dto/                  # Input/Output DTOs
│   ├── payments/                 # Payment tracking
│   ├── documents/                # File management
│   ├── print/                    # PDF generation
│   │   ├── print.controller.ts
│   │   ├── print.service.ts
│   │   └── templates/            # Handlebars templates
│   ├── prisma/                   # Database service
│   │   ├── prisma.service.ts
│   │   └── soft-delete.middleware.ts
│   └── common/
│       ├── decorators/           # @Roles, @CurrentUser
│       └── enums/                # RBAC enums
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── main.tsx              # Entry point
│   │   ├── App.tsx               # Root component
│   │   ├── app/                  # Auth context, router
│   │   ├── pages/                # Page components
│   │   │   ├── dashboard/
│   │   │   ├── expenses/
│   │   │   ├── common-charges/
│   │   │   ├── payments/
│   │   │   ├── documents/
│   │   │   ├── announcements/
│   │   │   └── configuration/    # Buildings, apartments
│   │   ├── services/             # API clients
│   │   ├── components/           # Shared components
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Utilities (dateFormat, etc.)
│   └── package.json
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Initial data
│   └── migrations/               # Migration history
├── templates/                    # PDF templates
│   ├── layouts/base.hbs
│   ├── documents/
│   ├── partials/
│   └── styles/print.css
├── test/                         # Test files
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## 💾 Database Schema

### Enums (7)

```prisma
enum RoleType {
  SUPER_ADMIN
  BUILDING_ADMIN
  READ_ONLY
}

enum PaymentMethod {
  CASH
  BANK_TRANSFER
  CHECK
  ONLINE
}

enum DocumentCategory {
  INVOICE
  CONTRACT
  REPORT
  PHOTO
  OTHER
}

enum EventType {
  MEETING
  MAINTENANCE
  INSPECTION
  ASSEMBLY
  OTHER
}

enum AnnouncementPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  LOGIN
  LOGOUT
  LOCK
  UNLOCK
  APPROVE
  REJECT
}

enum ShareType {
  COMMON      // Κοινόχρηστα
  ELEVATOR    // Ανελκυστήρας
  HEATING     // Θέρμανση
  SPECIAL     // Ειδικά
  OWNER       // Ιδιοκτητών
  OTHER       // Λοιπά
}
```

### Core Models

#### User
```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  firstName String
  lastName  String
  phone     String?
  isActive  Boolean   @default(true)
  deletedAt DateTime? // Soft delete
  
  userRoles  UserRole[]
  apartments Apartment[]  // Owned apartments
  payments   Payment[]
}
```

#### Building
```prisma
model Building {
  id           String    @id @default(uuid())
  name         String
  address      String
  city         String
  postalCode   String
  taxId        String?   // ΑΦΜ
  deletedAt    DateTime?
  
  apartments   Apartment[]
  expenses     Expense[]
  periods      CommonChargePeriod[]
  documents    Document[]
}
```

#### Apartment
```prisma
model Apartment {
  id           String    @id @default(uuid())
  buildingId   String
  ownerId      String?
  number       String    // e.g., "1A", "2B"
  floor        Int
  squareMeters Decimal
  
  // Ownership shares (χιλιοστά) - stored as percentages (0-100)
  shareCommon   Decimal   @default(0)
  shareElevator Decimal   @default(0)
  shareHeating  Decimal   @default(0)
  shareOther    Decimal   @default(0)
  
  isOccupied   Boolean   @default(true)
  deletedAt    DateTime?
  
  building     Building  @relation(...)
  owner        User?     @relation(...)
  payments     Payment[]
  chargeLines  CommonChargeLine[]
}
```

#### Expense
```prisma
model Expense {
  id                  String    @id @default(uuid())
  buildingId          String
  categoryId          String?
  supplierId          String?
  description         String
  amount              Decimal
  expenseDate         DateTime
  invoiceNumber       String?
  
  // Direct charge fields
  isDirectCharge      Boolean   @default(false)
  chargedApartmentId  String?   // UUID of apartment if direct charge
  
  deletedAt           DateTime?
  
  building            Building  @relation(...)
  category            ExpenseCategory? @relation(...)
  chargedApartment    Apartment? @relation(...)
}
```

#### ExpenseCategory
```prisma
model ExpenseCategory {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  shareType   ShareType @default(COMMON)  // Determines distribution
  isActive    Boolean   @default(true)
  
  expenses    Expense[]
}
```

#### CommonChargePeriod
```prisma
model CommonChargePeriod {
  id         String    @id @default(uuid())
  buildingId String
  name       String    // e.g., "Ιανουάριος 2026"
  startDate  DateTime
  endDate    DateTime
  dueDate    DateTime  // Payment deadline
  isLocked   Boolean   @default(false)
  lockedAt   DateTime?
  version    Int       @default(1)
  deletedAt  DateTime?
  
  building   Building  @relation(...)
  lines      CommonChargeLine[]
}
```

#### CommonChargeLine
```prisma
model CommonChargeLine {
  id          String    @id @default(uuid())
  periodId    String
  apartmentId String
  
  totalAmount       Decimal
  previousBalance   Decimal   @default(0)
  currentCharges    Decimal
  totalDue          Decimal
  
  calculationJson   Json?     // Full breakdown for audit
  
  period      CommonChargePeriod @relation(...)
  apartment   Apartment @relation(...)
}
```

#### Payment
```prisma
model Payment {
  id            String        @id @default(uuid())
  buildingId    String
  apartmentId   String
  userId        String
  amount        Decimal
  paymentDate   DateTime
  paymentMethod PaymentMethod
  reference     String?       // Check/transfer number
  notes         String?
  deletedAt     DateTime?
  
  apartment     Apartment     @relation(...)
  user          User          @relation(...)
}
```

#### Document
```prisma
model Document {
  id          String           @id @default(uuid())
  buildingId  String
  title       String
  description String?
  category    DocumentCategory
  fileName    String
  filePath    String
  mimeType    String
  size        Int
  deletedAt   DateTime?
  
  building    Building         @relation(...)
}
```

### Full Schema Features

- **UUIDs** - All primary keys are UUIDs for global uniqueness
- **Soft Delete** - 13 models have `deletedAt` field for recoverable deletion
- **Indexes** - 47 optimized indexes for query performance
- **Audit Trail** - AuditLog table tracks all changes

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/register` | Register new user |
| GET | `/api/v1/auth/profile` | Get current user profile |

### Buildings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings` | List all buildings |
| POST | `/api/v1/buildings` | Create building |
| GET | `/api/v1/buildings/:id` | Get building details |
| PATCH | `/api/v1/buildings/:id` | Update building |
| DELETE | `/api/v1/buildings/:id` | Delete building |

### Apartments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings/:buildingId/apartments` | List apartments |
| POST | `/api/v1/buildings/:buildingId/apartments` | Create apartment |
| GET | `/api/v1/buildings/:buildingId/apartments/:id` | Get apartment |
| PATCH | `/api/v1/buildings/:buildingId/apartments/:id` | Update apartment |
| DELETE | `/api/v1/buildings/:buildingId/apartments/:id` | Delete apartment |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings/:buildingId/expenses` | List expenses |
| POST | `/api/v1/buildings/:buildingId/expenses` | Create expense |
| GET | `/api/v1/buildings/:buildingId/expenses/:id` | Get expense |
| PATCH | `/api/v1/buildings/:buildingId/expenses/:id` | Update expense |
| DELETE | `/api/v1/buildings/:buildingId/expenses/:id` | Delete expense |
| GET | `/api/v1/expense-categories` | List categories |

### Common Charges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings/:buildingId/common-charges/periods` | List periods |
| POST | `/api/v1/buildings/:buildingId/common-charges/periods` | Create period |
| GET | `/api/v1/buildings/:buildingId/common-charges/periods/:id` | Get period |
| PATCH | `/api/v1/buildings/:buildingId/common-charges/periods/:id` | Update period |
| DELETE | `/api/v1/buildings/:buildingId/common-charges/periods/:id` | Delete period |
| GET | `/api/v1/buildings/:buildingId/common-charges/periods/:id/preview` | Preview calculation |
| POST | `/api/v1/buildings/:buildingId/common-charges/periods/:id/calculate` | Run calculation |
| POST | `/api/v1/buildings/:buildingId/common-charges/periods/:id/lock` | Lock period |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings/:buildingId/payments` | List payments |
| POST | `/api/v1/buildings/:buildingId/payments` | Create payment |
| GET | `/api/v1/buildings/:buildingId/payments/:id` | Get payment |
| DELETE | `/api/v1/buildings/:buildingId/payments/:id` | Delete payment |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings/:buildingId/documents` | List documents |
| POST | `/api/v1/buildings/:buildingId/documents` | Upload document |
| GET | `/api/v1/buildings/:buildingId/documents/:id/download` | Download |
| DELETE | `/api/v1/buildings/:buildingId/documents/:id` | Delete document |

### Announcements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/buildings/:buildingId/announcements` | List announcements |
| POST | `/api/v1/buildings/:buildingId/announcements` | Create announcement |
| PATCH | `/api/v1/buildings/:buildingId/announcements/:id` | Update announcement |
| DELETE | `/api/v1/buildings/:buildingId/announcements/:id` | Delete announcement |

### Print/PDF
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/print/common-charges/:periodId` | Generate PDF report |
| GET | `/api/v1/print/apartment/:apartmentId/period/:periodId` | Apartment statement |

---

## 🖥 Frontend Features

### Pages

1. **Dashboard** (`/dashboard`)
   - Building overview
   - Recent expenses
   - Recent announcements
   - Quick stats

2. **Expenses** (`/expenses`)
   - List all expenses with filters
   - Create/Edit expense form
   - Charge type: Shared vs Direct charge
   - Category selection

3. **Common Charges** (`/common-charges`)
   - Period management (create, edit, delete)
   - Preview calculation before saving
   - Calculate and lock periods
   - View breakdown by apartment

4. **Payments** (`/payments`)
   - Record payments by apartment
   - Payment method (Cash, Transfer, Check)
   - Payment history

5. **Documents** (`/documents`)
   - File upload/download
   - Category filtering
   - Bulk download

6. **Announcements** (`/announcements`)
   - Create announcements
   - Priority levels
   - Active/Inactive status

7. **Configuration** (`/configuration`)
   - Buildings management
   - Apartments management
   - Share percentages (χιλιοστά)
   - Users management

### UI Features

- **Date Format**: DD/MM/YYYY (Greek format)
- **Currency**: EUR (€)
- **Language**: Greek (el-GR) with English fallback
- **Form Validation**: Client-side validation with error messages
- **Responsive Design**: Mobile-friendly with TailwindCSS

### Form Validations

**Period Creation:**
- Start date must be before end date
- Due date must be after end date
- All dates required

**Expense Creation:**
- Amount must be positive
- Category required
- If direct charge, apartment selection required

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd BuildingManager

# 2. Start all services
docker-compose up -d

# 3. Wait for services to be ready (about 30 seconds)
# API: http://localhost:3000
# Frontend: http://localhost:5173

# 4. Login with default credentials
# Email: admin@buildingmanager.com
# Password: Admin123!
```

### Docker Compose Services

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: building_manager
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/building_manager
      JWT_SECRET: your-super-secret-jwt-key
      JWT_EXPIRATION: 24h
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - api
```

### Manual Setup

```bash
# Backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/building_manager"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="24h"

# Server
PORT=3000
NODE_ENV=development
```

---

## 💻 Development Guide

### Running Tests

```bash
# Unit tests
npm run test

# Property-based tests
npm run test:property

# All tests with coverage
npm run test:cov
```

### Database Operations

```bash
# Open Prisma Studio (GUI)
npx prisma studio

# Generate client after schema changes
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration-name>

# Reset database (DEV ONLY)
npx prisma migrate reset

# Push schema without migration
npx prisma db push

# Connect to PostgreSQL
docker exec -it building-manager-postgres psql -U postgres -d building_manager
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run build
```

### Adding New Features

1. **Database changes**: Update `prisma/schema.prisma`
2. **Generate migration**: `npx prisma migrate dev --name <name>`
3. **Create DTO**: Add to `src/<module>/dto/`
4. **Create service method**: Add to `src/<module>/<module>.service.ts`
5. **Create controller endpoint**: Add to `src/<module>/<module>.controller.ts`
6. **Frontend API call**: Add to `frontend/src/services/endpoints.ts`
7. **Frontend UI**: Add to appropriate page in `frontend/src/pages/`

---

## 📐 Business Rules

### Expense Distribution Calculation

```typescript
// For shared expenses (Κοινόχρηστο)
apartmentCharge = (expenseAmount × apartmentShare) / totalActiveShares

// For direct charges (Χρέωση σε διαμέρισμα)
apartmentCharge = expenseAmount  // 100% to specified apartment
```

### Share Validation

- Total shares across all apartments should sum to 100%
- Each share type (common, elevator, heating, other) is tracked separately
- Excluded apartments don't participate in calculations

### Period Workflow

1. **DRAFT** - Period created, can add/edit expenses
2. **CALCULATED** - Calculation run, can recalculate
3. **LOCKED** - Period locked, no changes allowed

### Rounding Strategy

- All amounts rounded to 2 decimal places
- Rounding difference distributed proportionally to maintain total accuracy
- Invariant: `sum(apartmentCharges) === totalExpenses`

### Date Rules

- Period start date < end date
- Due date >= end date
- Expense date must fall within period date range

---

## 📄 License

UNLICENSED - Private project

---

## 🔗 Additional Documentation

- [Business Rules](./BUSINESS_RULES.md) - Detailed calculation rules
- [Database Architecture](./DATABASE_ARCHITECTURE.md) - Schema design decisions
- [Testing Strategy](./TESTING_STRATEGY.md) - Test patterns and coverage
- [Migration Guide](./MIGRATION_GUIDE.md) - Database migration procedures
