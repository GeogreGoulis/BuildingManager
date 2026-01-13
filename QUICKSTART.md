# 🎉 Επιτυχής Εγκατάσταση Building Manager API

## ✅ Τι Ολοκληρώθηκε

### 1. **Project Setup**
- ✅ NestJS project structure
- ✅ TypeScript configuration
- ✅ Docker PostgreSQL container
- ✅ Prisma ORM με complete schema
- ✅ Database migrations
- ✅ Initial data seeding

### 2. **Implemented Modules**

#### **Authentication & Authorization** ✅
- JWT-based authentication
- Login/Register endpoints
- Role-based access control (RBAC)
- Building-scoped permissions

#### **Users Management** ✅
- Full CRUD operations
- Role assignment (global & building-scoped)
- User listing by building
- Comprehensive audit logging

#### **Buildings & Apartments** ✅
- Building CRUD operations
- Apartment CRUD operations
- Share percentage validation (≤100%)
- Owner assignment
- Audit logging

### 3. **Database** ✅
Complete schema με 17 models:
- Users, Roles, UserRoles
- Buildings, Apartments
- Expenses, ExpenseCategories, Suppliers
- OilDeliveries, OilMeasurements
- CommonChargePeriods, CommonChargeLines
- Payments, Documents
- Events, Reminders
- Announcements, Comments
- AuditLogs

### 4. **Security** ✅
- JWT authentication
- Password hashing (bcrypt)
- Role-based guards
- Building-scoped authorization
- Comprehensive audit trail

---

## 🚀 Πώς να Ξεκινήσετε

### Βήμα 1: Ξεκινήστε τον Development Server

```bash
npm run start:dev
```

Θα δείτε:
```
🚀 Application is running on: http://localhost:3000/api/v1
```

### Βήμα 2: Δοκιμάστε το API

Ανοίξτε ένα **νέο terminal** (αφήστε τον server να τρέχει) και εκτελέστε:

```bash
# Login ως Super Admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@buildingmanager.com",
    "password": "Admin123!"
  }'
```

**Αναμενόμενο response:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@buildingmanager.com",
    "firstName": "Super",
    "lastName": "Admin",
    "roles": [
      {
        "role": "SUPER_ADMIN",
        "buildingId": null
      }
    ]
  }
}
```

### Βήμα 3: Χρησιμοποιήστε το Token

**Επιλογή Α: Φορτώστε το TOKEN από το .env (Προτεινόμενο)**
```bash
# Φορτώστε το TOKEN από το .env file
source .env

# Τώρα μπορείτε να χρησιμοποιήσετε το $TOKEN
echo $TOKEN
```

**Επιλογή Β: Αντιγράψτε το token manually**
```bash
# Αποθηκεύστε το token σε variable
TOKEN="paste-your-token-here"
```

**Τώρα δοκιμάστε το API:**

```bash
# Δημιουργήστε μια πολυκατοικία
curl -X POST http://localhost:3000/api/v1/buildings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Πολυκατοικία Κολωνακίου",
    "address": "Σκουφά 12",
    "city": "Αθήνα",
    "postalCode": "10673",
    "apartmentCount": 8,
    "floors": 4
  }'

# Λίστα πολυκατοικιών
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/buildings

# Δημιουργήστε διαμέρισμα
curl -X POST http://localhost:3000/api/v1/buildings/apartments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "buildingId": "paste-building-id-here",
    "number": "1A",
    "floor": 1,
    "squareMeters": 85,
    "sharePercentage": 12.5
  }'
```

---

## 📚 Available API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login

### Users (Requires Authentication)
- `POST /api/v1/users` - Create user (SUPER_ADMIN)
- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user details
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user
- `POST /api/v1/users/:id/roles` - Assign role
- `DELETE /api/v1/users/:userId/roles/:roleId` - Remove role
- `GET /api/v1/users/building/:buildingId` - Get users by building

### Buildings (Requires Authentication)
- `POST /api/v1/buildings` - Create building (SUPER_ADMIN)
- `GET /api/v1/buildings` - List all buildings
- `GET /api/v1/buildings/:id` - Get building details
- `PATCH /api/v1/buildings/:id` - Update building
- `DELETE /api/v1/buildings/:id` - Delete building

### Apartments (Requires Authentication)
- `POST /api/v1/buildings/apartments` - Create apartment
- `GET /api/v1/buildings/apartments/all` - List apartments
- `GET /api/v1/buildings/apartments/:id` - Get apartment details
- `PATCH /api/v1/buildings/apartments/:id` - Update apartment
- `DELETE /api/v1/buildings/apartments/:id` - Delete apartment

---

## 🗂️ Default Credentials

**Super Admin:**
- Email: `admin@buildingmanager.com`
- Password: `Admin123!`

**Roles:**
- `SUPER_ADMIN` - Full system access (global)
- `BUILDING_ADMIN` - Full access to assigned building
- `READ_ONLY` - Read-only access to assigned building

---

## 🛠️ Χρήσιμες Εντολές

```bash
# Development
npm run start:dev          # Start with hot reload
npm run build              # Build for production
npm run start:prod         # Start production server

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma Studio GUI
npm run prisma:seed        # Seed database

# Docker
docker-compose up -d       # Start all containers
docker-compose down        # Stop all containers
docker-compose logs -f     # View logs

# Testing
npm run test               # Run unit tests
npm run test:e2e           # Run e2e tests
npm run test:cov           # Test coverage

# Code Quality
npm run lint               # Lint code
npm run format             # Format code
```

---

## 📁 Project Structure

```
BuildingManager/
├── src/
│   ├── auth/                    # ✅ JWT Auth & RBAC
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   └── interfaces/
│   ├── users/                   # ✅ User Management
│   │   ├── dto/
│   │   └── users.service.ts
│   ├── buildings/               # ✅ Buildings & Apartments
│   │   ├── dto/
│   │   └── buildings.service.ts
│   ├── expenses/                # 🔲 To be implemented
│   ├── oil-management/          # 🔲 To be implemented
│   ├── common-charges/          # 🔲 To be implemented
│   ├── documents/               # 🔲 To be implemented
│   ├── audit-log/               # ✅ Audit logging (used by other modules)
│   ├── common/                  # Shared decorators & enums
│   └── prisma/                  # Database service
├── prisma/
│   ├── schema.prisma            # Complete database schema
│   └── seed.ts                  # Database seeding
├── docker-compose.yml           # PostgreSQL container
└── .env                         # Environment variables
```

---

## 🎯 Επόμενα Βήματα (Phase 2+)

### Priority 1: Expenses Module
- CRUD για expenses
- Category & supplier management
- Invoice tracking
- Monthly/yearly reports

### Priority 2: Oil Management
- Oil delivery recording
- Meter readings per apartment
- Cost allocation based on usage
- Seasonal analytics

### Priority 3: Common Charges
- Period creation & locking
- Automatic charge calculation
- Per-apartment breakdown
- PDF generation for distribution

### Priority 4: Documents
- File upload (invoices, contracts)
- Association with expenses/deliveries
- Download & preview
- S3 integration for production

### Priority 5: Payments
- Payment recording
- Balance tracking
- Payment history
- Overdue notifications

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Restart PostgreSQL container
docker-compose restart postgres

# Check if running
docker-compose ps
```

### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)
```

### Prisma Client Out of Sync
```bash
npm run prisma:generate
```

### Migration Issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Re-seed
npm run prisma:seed
```

---

## 📝 Notes

- **Production**: Αλλάξτε το `JWT_SECRET` στο `.env`
- **Security**: Ενεργοποιήστε HTTPS σε production
- **Performance**: Προσθέστε caching (Redis) για production
- **Monitoring**: Εγκαταστήστε Sentry ή LogRocket
- **Testing**: Γράψτε unit & e2e tests πριν production

---

## 🎊 Συγχαρητήρια!

Έχετε ένα πλήρως λειτουργικό NestJS backend με:
- ✅ Authentication & Authorization
- ✅ User Management με RBAC
- ✅ Building & Apartment Management
- ✅ Complete Database Schema
- ✅ Audit Trail
- ✅ Production-ready structure

**Ξεκινήστε τον server και αρχίστε να δοκιμάζετε το API!** 🚀
