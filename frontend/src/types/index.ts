// Auth & User types
export type UserRole = 'SUPER_ADMIN' | 'BUILDING_ADMIN' | 'READ_ONLY';

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN' as const,
  BUILDING_ADMIN: 'BUILDING_ADMIN' as const,
  READ_ONLY: 'READ_ONLY' as const,
};

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  buildingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Building types
export interface Building {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  totalApartments: number;
  createdAt: string;
}

// Apartment types
export interface Apartment {
  id: string;
  buildingId: string;
  number: string;
  floor: string;
  sharePercentage: number;
  heatingSharePercentage: number;
  isOccupied: boolean;
  isExcluded: boolean;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

// Expense types
export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
}

export type DistributionMethod = 'GENERAL_SHARE' | 'HEATING_SHARE' | 'EQUAL_SPLIT' | 'CUSTOM' | 'CONSUMPTION_BASED';

export const DistributionMethod = {
  GENERAL_SHARE: 'GENERAL_SHARE' as const,
  HEATING_SHARE: 'HEATING_SHARE' as const,
  EQUAL_SPLIT: 'EQUAL_SPLIT' as const,
  CUSTOM: 'CUSTOM' as const,
  CONSUMPTION_BASED: 'CONSUMPTION_BASED' as const,
};

export interface Expense {
  id: string;
  buildingId: string;
  categoryId: string;
  category?: ExpenseCategory;
  amount: number;
  description: string;
  distributionMethod: DistributionMethod;
  date: string;
  invoiceNumber?: string;
  vendor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Common Charges types
export interface CommonChargesPeriod {
  id: string;
  buildingId: string;
  year: number;
  month: number;
  status: 'DRAFT' | 'CALCULATED' | 'LOCKED';
  totalExpenses: number;
  calculatedAt?: string;
  lockedAt?: string;
  createdAt: string;
}

export interface ApartmentCharge {
  apartmentId: string;
  apartmentNumber: string;
  subtotal: number;
  previousBalance: number;
  total: number;
  expenses: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
}

export interface CommonChargesCalculation {
  periodId: string;
  totalExpenses: number;
  totalDistributed: number;
  apartmentCharges: ApartmentCharge[];
  calculatedAt: string;
}

// Payment types
export interface Payment {
  id: string;
  buildingId: string;
  apartmentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CHECK' | 'OTHER';
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

// Document types
export interface Document {
  id: string;
  buildingId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

// Announcement types
export interface Announcement {
  id: string;
  buildingId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}
