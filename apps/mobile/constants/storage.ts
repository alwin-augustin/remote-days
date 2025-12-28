// Storage keys - single source of truth for SecureStore/AsyncStorage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  AUTH_USER: 'auth_user',
  OFFLINE_QUEUE: 'offline_entry_queue',
  ANALYTICS_QUEUE: 'analytics_queue',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
