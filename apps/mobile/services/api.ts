import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthUser, Entry, EmployeeStats, LocationType } from '@remotedays/types';
import { STORAGE_KEYS } from '../constants/storage';
import { logger } from './logger';
import { ApiError, NetworkError } from './errors';
import { authEvents } from './authEvents';

const TAG = 'API';

// Determine API URL with production safeguard
const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

// Handle Android Emulator localhost mapping
const getBaseUrl = (): string => {
  const url = API_URL || 'http://localhost:3000';

  if (Platform.OS === 'android' && url.includes('localhost')) {
    return url.replace('localhost', '10.0.2.2');
  }

  return url;
};

const finalApiUrl = getBaseUrl();

logger.info(TAG, 'API URL configured:', finalApiUrl);

if (!API_URL && !__DEV__) {
  logger.error(TAG, 'API_URL must be configured for production builds');
}

const api = axios.create({
  baseURL: finalApiUrl,
  timeout: 10000,
});

// Request interceptor to attach auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  logger.debug(TAG, 'Request:', { url: config.url, method: config.method, hasToken: !!token });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    logger.debug(TAG, 'Response:', { url: response.config.url, status: response.status });
    return response;
  },
  async (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      logger.error(TAG, 'Network error:', error.message);
      return Promise.reject(new NetworkError());
    }

    const status = error.response.status;
    const url = error.config?.url;
    const responseData = error.response.data as { message?: string; code?: string } | undefined;

    logger.error(TAG, 'API Error:', { url, status, data: responseData });

    // Handle 401 - invalidate auth state
    if (status === 401) {
      logger.warn(TAG, '401 Unauthorized - invalidating session');
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_USER);
      // Notify AuthContext about token invalidation
      authEvents.emit('tokenInvalidated');
    }

    // Create proper ApiError
    const apiError = new ApiError(
      responseData?.message || error.message || 'An error occurred',
      status,
      responseData?.code
    );

    return Promise.reject(apiError);
  }
);

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface RequestData {
  date: string;
  status: LocationType;
  reason: string;
}

export interface Request {
  id: number;
  userId: number;
  date: string;
  currentStatus?: LocationType;
  requestedStatus: LocationType;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },
  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_USER);
  },
  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await api.get<AuthUser>('/auth/me');
    return response.data;
  },
};

export const locationService = {
  declare: async (data: { date: string; location: LocationType }): Promise<Entry> => {
    const response = await api.post<Entry>('/entries', {
      date: data.date,
      status: data.location,
    });
    return response.data;
  },
  getHistory: async (params?: { year?: number; month?: number; limit?: number; offset?: number }): Promise<Entry[]> => {
    const response = await api.get<Entry[]>('/entries', {
      params,
    });
    return response.data;
  },
};

// Transform snake_case API response to camelCase
interface ApiRequest {
  id: number;
  user_id: number;
  date: string;
  requested_status: LocationType;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

const transformRequest = (apiRequest: ApiRequest): Request => ({
  id: apiRequest.id,
  userId: apiRequest.user_id,
  date: apiRequest.date,
  requestedStatus: apiRequest.requested_status,
  reason: apiRequest.reason,
  status: apiRequest.status,
  adminNote: apiRequest.admin_note,
  createdAt: apiRequest.created_at,
  updatedAt: apiRequest.updated_at,
});

export const requestService = {
  create: async (data: RequestData): Promise<Request> => {
    const response = await api.post<ApiRequest>('/requests', data);
    return transformRequest(response.data);
  },
  getMyRequests: async (): Promise<Request[]> => {
    const response = await api.get<ApiRequest[]>('/requests/me');
    return response.data.map(transformRequest);
  },
};

export const statsService = {
  getMyStats: async (): Promise<EmployeeStats> => {
    const response = await api.get<EmployeeStats>('/entries/stats');
    return response.data;
  },
};

export default api;
