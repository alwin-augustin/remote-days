// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'employee';
  country?: string;
  createdAt: string;
  updatedAt: string;
}

// Location/Entry types
export type LocationType = 'home' | 'office';

export interface Entry {
  id: number;
  userId: number;
  date: string;
  location: LocationType;
  overridden: boolean;
  overriddenBy?: number;
  overriddenAt?: string;
  created_at: string;
  updated_at: string;
}

// Legacy alias for backwards compatibility
export type Location = Entry;

// Compliance status type
export type ComplianceStatus = 'safe' | 'warning' | 'critical' | 'exceeded';

// Employee stats for mobile
export interface EmployeeStats {
  remoteDaysCount: number;
  remoteDaysLimit: number;
  complianceStatus: ComplianceStatus;
  daysRemaining: number;
  percentageUsed: number;
}

// Declaration request
export interface DeclarationRequest {
  date: string;
  location: LocationType;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Auth types for mobile
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'employee';
  country?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// Offline queue types for mobile
export interface QueuedEntry {
  id: string;
  date: string;
  location: LocationType;
  createdAt: string;
  synced: boolean;
}

// Analytics event types
export type AnalyticsEventType =
  | 'app_open'
  | 'login'
  | 'logout'
  | 'declare_location'
  | 'screen_view'
  | 'error';

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  properties?: Record<string, unknown>;
  timestamp: string;
}
