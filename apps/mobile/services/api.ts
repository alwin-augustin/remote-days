import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, Entry, EmployeeStats, LocationType } from '@remotedays/types';
import { STORAGE_KEYS } from '../constants/storage';

// Debug logging helper
const debug = (message: string, data?: unknown) => {
  if (__DEV__) {
    console.log(`[API] ${message}`, data !== undefined ? data : '');
  }
};

import { Platform } from 'react-native';

// Determine API URL with production safeguard
const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;

// Handle Android Emulator localhost mapping
const getBaseUrl = () => {
  const url = API_URL || 'http://localhost:3000';

  if (Platform.OS === 'android' && url.includes('localhost')) {
    return url.replace('localhost', '10.0.2.2');
  }

  return url;
};

const finalApiUrl = getBaseUrl();

debug('API URL configured:', finalApiUrl);

if (!API_URL && !__DEV__) {
  console.error('API_URL must be configured for production builds');
}

const api = axios.create({
  baseURL: finalApiUrl,
  timeout: 10000,
});

// Request interceptor to attach auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  debug('Request:', { url: config.url, method: config.method, hasToken: !!token });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    debug('Response:', { url: response.config.url, status: response.status });
    return response;
  },
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const responseData = error.response?.data;

    debug('Error:', { url, status, data: responseData, message: error.message });

    if (status === 401) {
      debug('401 Unauthorized - clearing token');
      await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    }

    // Enhance error message
    const message = (responseData as { message?: string })?.message || error.message;
    const enhancedError = new Error(message);
    (enhancedError as unknown as { status: number }).status = status || 0;
    return Promise.reject(enhancedError);
  }
);

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },
  logout: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
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

export const requestService = {
  create: async (data: { date: string; status: LocationType; reason: string }) => {
    const response = await api.post('/requests', data);
    return response.data;
  },
  getMyRequests: async () => {
    const response = await api.get('/requests/me');
    return response.data;
  },
};

export const statsService = {
  getMyStats: async (): Promise<EmployeeStats> => {
    const response = await api.get<EmployeeStats>('/entries/stats');
    return response.data;
  },
};

export default api;
