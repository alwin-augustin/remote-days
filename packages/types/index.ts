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

export interface CountryThreshold {
  country_code: string;
  max_remote_days: number;
}
