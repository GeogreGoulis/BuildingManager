# Building Manager - Frontend Architecture

## Overview

React + TypeScript εφαρμογή για διαχείριση πολυκατοικιών με έμφαση σε:
- Role-based access control
- Data-heavy tables με fixed headers
- Print-friendly views
- Desktop-first responsive design

## Tech Stack Implemented

✅ **React 18** με TypeScript
✅ **Vite** - Fast build tool  
✅ **Tailwind CSS** - Utility-first styling
✅ **React Query (TanStack)** - Server state management
✅ **React Router** - Client-side routing
✅ **Axios** - HTTP client με interceptors
✅ **Recharts** - Charts library

## Architecture

### Folder Structure

```
src/
├── app/                      # Core app configuration
│   ├── AppRouter.tsx        # Main router με QueryClient
│   ├── AuthContext.tsx      # Authentication state
│   └── ProtectedRoute.tsx   # Route guards
│
├── pages/                    # Page components
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── expenses/
│   │   └── ExpensesPage.tsx
│   └── common-charges/
│       └── CommonChargesPage.tsx
│
├── components/              # Reusable components
│   └── layouts/
│       ├── AuthLayout.tsx   # Login layout
│       └── AppLayout.tsx    # Main app layout
│
├── features/                # Feature modules (future)
├── hooks/                   # Custom hooks (future)
├── services/                # API layer
│   ├── api.ts              # Axios client με auth
│   └── endpoints.ts        # Typed API calls
│
├── types/                   # TypeScript types
│   └── index.ts            # All domain types
│
├── utils/                   # Utilities (future)
└── index.css               # Global styles + Tailwind
```

## Implemented Features

### ✅ Authentication Flow

- Login page με form validation
- JWT token management (access + refresh)
- Automatic token refresh on 401
- Role-based context (SUPER_ADMIN, BUILDING_ADMIN, READ_ONLY)
- Protected routes με guards

### ✅ Layouts

**AuthLayout**: Centered login με branding
**AppLayout**: 
- Top navigation με role badge
- Responsive sidebar (mobile)
- User info + logout
- Print-friendly (`.no-print` class)

### ✅ Pages

**Dashboard**:
- Stats cards (total expenses, pending payments, etc.)
- Recent activity feed
- Quick action buttons
- Upcoming tasks

**Expenses**:
- Paginated table με fixed headers
- Summary cards (total, count, average)
- Sort/filter ready structure
- Role-based action buttons
- Footer με totals

**Common Charges**:
- Period list table
- Status badges (DRAFT, CALCULATED, LOCKED)
- Calculate/Lock/Download actions
- Instructions section

### ✅ Core Components

- **Loading states**: Spinner για async operations
- **Error states**: Consistent error messages
- **Empty states**: "Δεν βρέθηκαν" messages
- **Pagination**: Complete implementation
- **Tables**: Fixed headers, totals footer, hover states

## API Integration

### API Client (`services/api.ts`)

```typescript
class ApiClient {
  - Token management (localStorage)
  - Request interceptor (add Bearer token)
  - Response interceptor (handle 401, refresh token)
  - Generic methods (get, post, put, patch, delete)
  - Error handling
}
```

### Endpoints (`services/endpoints.ts`)

Typed API calls για:
- Auth (login, logout, me)
- Buildings (getAll, getById)
- Expenses (CRUD + pagination)
- Common Charges (periods, calculate, lock, downloadPdf)
- Payments (list, create, delete)
- Documents (list, upload, delete)
- Announcements (CRUD)

## Role-Based Access

### Implementation

```typescript
// Context
const { hasRole } = useAuth();
const canWrite = hasRole([UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN]);

// UI
<button disabled={!canWrite}>Νέο Έξοδο</button>
```

### Guards

```typescript
<ProtectedRoute roles={[UserRole.SUPER_ADMIN]}>
  <AdminOnlyPage />
</ProtectedRoute>
```

## Styling Approach

### Tailwind Configuration

- Custom color palette (primary blue)
- Print utilities (`.no-print`, page-break rules)
- Scrollbar hiding utilities
- Responsive breakpoints

### Design Principles

✅ Desktop-first (responsive down to mobile)
✅ Consistent spacing (Tailwind scale)
✅ Clean tables με fixed headers
✅ Predictable hover states
✅ Print-friendly (@media print rules)
✅ Accessible colors (contrast ratios)

## State Management

### Server State (React Query)

```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ['expenses', buildingId, page],
  queryFn: () => expensesApi.getAll(buildingId, { page }),
});
```

Configuration:
- `refetchOnWindowFocus: false`
- `retry: 1`
- `staleTime: 5min`

### Local State (React useState)

- Form inputs
- Pagination state
- Modal open/close
- UI toggles

### Auth State (Context)

- `user: User | null`
- `isAuthenticated: boolean`
- `isLoading: boolean`
- `login()`, `logout()`, `hasRole()`

## Next Steps

### High Priority
- [ ] Expense create/edit modal
- [ ] Common charges calculation flow
- [ ] Building selector (for super admins)
- [ ] Print preview modal

### Medium Priority
- [ ] Payments page implementation
- [ ] Documents upload με drag-drop
- [ ] Announcements CRUD
- [ ] User settings page

### Low Priority
- [ ] Charts/analytics (Recharts integration)
- [ ] Calendar view
- [ ] Advanced filters
- [ ] Bulk actions

## Development

```bash
cd frontend
npm install
npm run dev     # → http://localhost:5173
```

## Environment

```bash
# .env
VITE_API_BASE_URL=http://localhost:3000/api
```

## Notes

🔒 **No Business Logic**: Όλοι οι υπολογισμοί στο backend
📊 **Data-Heavy**: Tables optimized για πολλά rows
🖨️ **Print-Ready**: Proper print styles παντού
🎨 **Clean UI**: Professional, minimal, predictable
🔐 **Type-Safe**: Full TypeScript coverage
