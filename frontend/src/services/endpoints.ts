import { apiClient } from './api';
import type { 
  AuthResponse, 
  LoginCredentials, 
  User,
  Building,
  Expense,
  CommonChargesPeriod,
  Payment,
  Document,
  Announcement,
  PaginatedResponse
} from '../types';

// Auth API
export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthResponse>('/auth/login', credentials),

  logout: () => {
    apiClient.logout();
  },

  me: () =>
    apiClient.get<User>('/auth/me'),
};

// Buildings API
export const buildingsApi = {
  getAll: () =>
    apiClient.get<Building[]>('/buildings'),

  getById: (id: string) =>
    apiClient.get<Building>(`/buildings/${id}`),
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
