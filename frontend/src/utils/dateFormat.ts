/**
 * Date formatting utilities for consistent DD/MM/YYYY format
 */

/**
 * Format a date to DD/MM/YYYY format
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date string or '-' if invalid
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format a date to DD/MM/YYYY HH:mm format
 * @param date - Date object, string, or null/undefined
 * @returns Formatted date and time string or '-' if invalid
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format a date to show month and year in Greek
 * @param date - Date object, string, or null/undefined
 * @returns Formatted month/year string or '-' if invalid
 */
export const formatMonthYear = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
};
