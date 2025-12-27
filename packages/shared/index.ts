// API Configuration
export const API_CONFIG = {
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.remotedays.app',
  timeout: 10000,
};

// Compliance thresholds
export const COMPLIANCE_LIMITS = {
  france: 34,
  belgium: 24,
  germany: 183,
};

// Helper functions
export const getComplianceStatus = (
  remoteDaysCount: number | undefined | null,
  limit: number | undefined | null
): 'safe' | 'warning' | 'critical' | 'exceeded' => {
  const count = remoteDaysCount ?? 0;
  const maxLimit = limit ?? 1; // Prevent division by zero
  const percentage = (count / maxLimit) * 100;

  if (count > maxLimit) return 'exceeded';
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'safe';
};

export const getDaysRemaining = (
  remoteDaysCount: number | undefined | null,
  limit: number | undefined | null
): number => {
  const count = remoteDaysCount ?? 0;
  const maxLimit = limit ?? 0;
  return Math.max(0, maxLimit - count);
};

export const getPercentageUsed = (
  remoteDaysCount: number | undefined | null,
  limit: number | undefined | null
): number => {
  const count = remoteDaysCount ?? 0;
  const maxLimit = limit ?? 1; // Prevent division by zero
  if (maxLimit === 0) return 0;
  return Math.min(100, Math.round((count / maxLimit) * 100));
};

// Date formatting
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};
