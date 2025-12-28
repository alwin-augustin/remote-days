// ===========================================
// Shared Types for Remote Days Application
// ===========================================

// ===========================================
// User Types
// ===========================================

export type UserRole = 'admin' | 'hr' | 'employee';

/**
 * Full User type matching database schema
 * Used by API backend
 */
export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  country_of_residence: string;
  work_country: string;
  is_active: boolean;
  password_hash?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

/**
 * Simplified Auth User for frontend/mobile
 * Excludes sensitive fields like password_hash
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  country?: string;
}

// ===========================================
// Work Status / Location Types
// ===========================================

/**
 * Work status - matches database enum
 */
export type work_status = 'home' | 'office' | 'travel' | 'sick' | 'unknown';

/**
 * Location type - simplified for mobile (home/office only)
 */
export type LocationType = 'home' | 'office';

// ===========================================
// Entry Types
// ===========================================

/**
 * Work entry matching database schema
 */
export interface Entry {
  id: number;
  user_id: string;
  date: string;
  location: LocationType;
  status?: work_status;
  overridden: boolean;
  overridden_by?: string;
  overridden_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Legacy alias for backwards compatibility
 */
export type Location = Entry;

// ===========================================
// Compliance Types
// ===========================================

/**
 * Compliance status levels
 */
export type ComplianceStatus = 'safe' | 'warning' | 'critical' | 'exceeded';

/**
 * Employee stats for compliance tracking
 */
export interface EmployeeStats {
  remoteDaysCount: number;
  remoteDaysLimit: number;
  complianceStatus: ComplianceStatus;
  daysRemaining: number;
  percentageUsed: number;
}

// ===========================================
// Request Types
// ===========================================

export type RequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * Entry modification request
 */
export interface EntryRequest {
  id: string;
  user_id: string;
  date: string;
  requested_status: work_status;
  reason: string;
  status: RequestStatus;
  admin_id?: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  // Joined fields from user table
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

/**
 * Simplified request for mobile (camelCase)
 */
export interface Request {
  id: string;
  userId: string;
  date: string;
  requestedStatus: LocationType;
  reason: string;
  status: RequestStatus;
  adminId?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ===========================================
// API Types
// ===========================================

export interface DeclarationRequest {
  date: string;
  location: LocationType;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

// ===========================================
// Offline Queue Types (Mobile)
// ===========================================

export interface QueuedEntry {
  id: string;
  date: string;
  location: LocationType;
  createdAt: string;
  synced: boolean;
}

// ===========================================
// Analytics Types
// ===========================================

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

// ===========================================
// HR Dashboard Types
// ===========================================

export interface DailyEntry {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: work_status;
  country_of_residence: string;
}

export interface EmployeeSummary {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  country_of_residence: string;
  work_country: string;
  days_used_current_year: number;
  max_remote_days: number;
  days_remaining: number;
  percent_used: number;
  risk_level: 'green' | 'orange' | 'red';
}

// ===========================================
// Audit Types
// ===========================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OVERRIDE';

export interface AuditLog {
  id: string;
  action: AuditAction;
  actor_id: string;
  target_user_id?: string;
  reason?: string;
  entity_type?: string;
  entity_id?: string;
  entry_date?: string;
  previous_status?: work_status;
  new_status?: work_status;
  previous_location?: LocationType;
  new_location?: LocationType;
  details?: Record<string, unknown>;
  created_at: string;
  // Joined fields
  actor_email?: string;
  actor_first_name?: string;
  actor_last_name?: string;
  target_email?: string;
  target_first_name?: string;
  target_last_name?: string;
}

// ===========================================
// Compliance Zone Types
// ===========================================

export interface ComplianceZone {
  id: string;
  country_code: string;
  country_name: string;
  max_remote_days: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ===========================================
// Holiday Types
// ===========================================

export interface Holiday {
  id: string;
  date: string;
  name: string;
  country_code: string | null; // null = global
  created_at: string;
}

// ===========================================
// Additional Backend Types
// ===========================================

/**
 * User info returned from authentication
 */
export interface UserInfo {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  country_of_residence: string;
  work_country: string;
}

/**
 * Audit log details - flexible JSON structure
 */
export type AuditDetails = Record<string, unknown>;
