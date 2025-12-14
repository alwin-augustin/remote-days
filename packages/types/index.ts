export type work_status = 'home' | 'office' | 'travel' | 'sick' | 'unknown';

export interface User {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  country_of_residence: string;
  work_country: string;
  role: 'employee' | 'hr' | 'admin';
  is_active: boolean;
  password_hash: string;
  created_at: Date;
}

export type UserInfo = Omit<User, 'password_hash'>;

export interface AuditDetails {
  date?: string;
  previous_status?: string;
  new_status?: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  [key: string]: unknown;
}

export interface Entry {
  id: string;
  user_id: string;
  date: string;
  status: work_status;
  source: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserStats {
  days_used_current_year: number;
  days_remaining: number;
  percent_used: number;
  year: number;
}

export interface CountryThreshold {
  country_code: string;
  max_remote_days: number;
}

export interface Holiday {
  id: number;
  date: string;
  country_code: string | null; // null for global
  description: string;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface EntryRequest {
  id: string;
  user_id: string;
  date: string;
  requested_status: work_status;
  reason: string;
  status: RequestStatus;
  admin_id?: string;
  admin_note?: string;
  created_at: Date;
  updated_at: Date;
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}
