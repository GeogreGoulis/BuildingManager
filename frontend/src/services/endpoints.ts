import { apiClient } from './api';
import type { 
  AuthResponse, 
  LoginCredentials, 
  User,
  Building,
  Apartment,
  Expense,
  ExpenseCategory,
  CommonChargesPeriod,
  Payment,
  Document,
  Announcement,
  PaginatedResponse
} from '../types';
import { UserRole } from '../types';

// Helper to transform backend user response to frontend User type
const transformUser = (backendUser: any): User => {
  // Backend returns roles as array: [{ role: 'SUPER_ADMIN', buildingId: null }]
  // Frontend expects single role string
  const roles = backendUser.roles || [];
  const primaryRole = roles[0]?.role || UserRole.READ_ONLY;
  const buildingId = roles.find((r: any) => r.buildingId)?.buildingId;

  return {
    id: backendUser.id,
    email: backendUser.email,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    role: primaryRole as any,
    buildingId,
    createdAt: backendUser.createdAt || new Date().toISOString(),
    updatedAt: backendUser.updatedAt || new Date().toISOString(),
  };
};

// Auth API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<any>('/auth/login', credentials);
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || '',
      user: transformUser(response.user),
    };
  },

  logout: () => {
    apiClient.logout();
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get<any>('/auth/me');
    return transformUser(response);
  },
};

// Buildings API
export const buildingsApi = {
  getAll: () =>
    apiClient.get<Building[]>('/buildings'),

  getById: (id: string) =>
    apiClient.get<Building>(`/buildings/${id}`),

  create: (data: Partial<Building>) =>
    apiClient.post<Building>('/buildings', data),

  update: (id: string, data: Partial<Building>) =>
    apiClient.patch<Building>(`/buildings/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/buildings/${id}`),
};

// Apartments API
export const apartmentsApi = {
  getAll: (buildingId?: string) =>
    apiClient.get<Apartment[]>('/buildings/apartments/all', { params: { buildingId } }),

  getById: (id: string) =>
    apiClient.get(`/buildings/apartments/${id}`),

  create: (data: any) =>
    apiClient.post('/buildings/apartments', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/buildings/apartments/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/buildings/apartments/${id}`),
};

// Users API
export const usersApi = {
  getAll: () =>
    apiClient.get<User[]>('/users'),

  getById: (id: string) =>
    apiClient.get(`/users/${id}`),

  create: (data: any) =>
    apiClient.post('/users', data),

  update: (id: string, data: any) =>
    apiClient.patch(`/users/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/users/${id}`),

  assignRole: (userId: string, data: { roleId: string; buildingId?: string }) =>
    apiClient.post(`/users/${userId}/roles`, data),

  removeRole: (userId: string, roleId: string, buildingId?: string) =>
    apiClient.delete(`/users/${userId}/roles/${roleId}`, { params: { buildingId } }),
};

// Expense Categories API
export const expenseCategoriesApi = {
  getAll: () =>
    apiClient.get<ExpenseCategory[]>('/expense-categories'),

  create: (data: { name: string; description?: string }) =>
    apiClient.post('/expense-categories', data),

  update: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch(`/expense-categories/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/expense-categories/${id}`),
};

// Expenses API
export const expensesApi = {
  getAll: (buildingId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Expense>>(`/buildings/${buildingId}/expenses`, { params }),

  getById: (buildingId: string, id: string) =>
    apiClient.get<Expense>(`/buildings/${buildingId}/expenses/${id}`),

  create: (buildingId: string, data: Partial<Expense>) =>
    apiClient.post<Expense>(`/buildings/${buildingId}/expenses`, data),

  update: (buildingId: string, id: string, data: Partial<Expense>) =>
    apiClient.put<Expense>(`/buildings/${buildingId}/expenses/${id}`, data),

  delete: (buildingId: string, id: string) =>
    apiClient.delete(`/buildings/${buildingId}/expenses/${id}`),
};

// Common Charges API
export const commonChargesApi = {
  getPeriods: (buildingId: string) =>
    apiClient.get<CommonChargesPeriod[]>(`/buildings/${buildingId}/common-charges/periods`),

  create: (buildingId: string, data: { name: string; startDate: string; endDate: string; dueDate: string }) =>
    apiClient.post<CommonChargesPeriod>(`/buildings/${buildingId}/common-charges/periods`, data),

  update: (buildingId: string, periodId: string, data: { name?: string; startDate?: string; endDate?: string; dueDate?: string }) =>
    apiClient.patch<CommonChargesPeriod>(`/buildings/${buildingId}/common-charges/periods/${periodId}`, data),

  delete: (buildingId: string, periodId: string) =>
    apiClient.delete(`/buildings/${buildingId}/common-charges/periods/${periodId}`),

  preview: (buildingId: string, periodId: string) =>
    apiClient.get(`/buildings/${buildingId}/common-charges/periods/${periodId}/preview`),

  calculate: (buildingId: string, periodId: string) =>
    apiClient.post(`/buildings/${buildingId}/common-charges/periods/${periodId}/calculate`),

  lock: (buildingId: string, periodId: string) =>
    apiClient.post(`/buildings/${buildingId}/common-charges/periods/${periodId}/lock`),

  downloadPdf: (buildingId: string, periodId: string) =>
    apiClient.get(`/buildings/${buildingId}/common-charges/periods/${periodId}/pdf`, {
      responseType: 'blob',
    }),
};

// Payments API
export const paymentsApi = {
  getAll: (buildingId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Payment>>(`/buildings/${buildingId}/payments`, { params }),

  create: (buildingId: string, data: Partial<Payment>) =>
    apiClient.post<Payment>(`/buildings/${buildingId}/payments`, data),

  delete: (buildingId: string, id: string) =>
    apiClient.delete(`/buildings/${buildingId}/payments/${id}`),
};

// Documents API
export const documentsApi = {
  getAll: (buildingId: string) =>
    apiClient.get<Document[]>(`/buildings/${buildingId}/documents`),

  upload: (buildingId: string, file: File, title: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (description) formData.append('description', description);

    return apiClient.post<Document>(`/buildings/${buildingId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (buildingId: string, id: string) =>
    apiClient.delete(`/buildings/${buildingId}/documents/${id}`),
};

// Announcements API
export const announcementsApi = {
  getAll: (buildingId: string) =>
    apiClient.get<Announcement[]>(`/buildings/${buildingId}/announcements`),

  create: (buildingId: string, data: Partial<Announcement>) =>
    apiClient.post<Announcement>(`/buildings/${buildingId}/announcements`, data),

  update: (buildingId: string, id: string, data: Partial<Announcement>) =>
    apiClient.put<Announcement>(`/buildings/${buildingId}/announcements/${id}`, data),

  delete: (buildingId: string, id: string) =>
    apiClient.delete(`/buildings/${buildingId}/announcements/${id}`),
};
