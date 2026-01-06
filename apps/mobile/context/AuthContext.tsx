import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthUser } from '@remotedays/types';
import { STORAGE_KEYS } from '../constants/storage';
import { analyticsService } from '../services/analytics';
import { authEvents } from '../services/authEvents';
import { logger } from '../services/logger';

const TAG = 'AuthContext';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadStoredAuth();

    // Subscribe to auth events (e.g., 401 from API)
    const unsubscribe = authEvents.on('tokenInvalidated', () => {
      logger.info(TAG, 'Token invalidated event received - logging out');
      if (isMountedRef.current) {
        handleTokenInvalidation();
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const handleTokenInvalidation = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.AUTH_USER),
      ]);

      if (!isMountedRef.current) return;

      if (storedToken) {
        setToken(storedToken);
        setIsAuthenticated(true);
        logger.debug(TAG, 'Restored auth token from storage');

        // Restore user data if available
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser) as AuthUser;
            setUser(parsedUser);
            logger.debug(TAG, 'Restored user data from storage');
          } catch {
            logger.warn(TAG, 'Invalid stored user data - will be fetched fresh');
          }
        }
      } else {
        setIsAuthenticated(false);
        logger.debug(TAG, 'No stored auth token found');
      }
    } catch (error) {
      logger.error(TAG, 'Error loading auth state:', error);
      if (isMountedRef.current) {
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const login = useCallback(async (newToken: string, userData: AuthUser) => {
    try {
      // Store token and user data
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, newToken),
        SecureStore.setItemAsync(STORAGE_KEYS.AUTH_USER, JSON.stringify(userData)),
      ]);

      if (!isMountedRef.current) return;

      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);

      // Track login
      analyticsService.trackLogin(userData.id);
      logger.info(TAG, 'User logged in:', { userId: userData.id, email: userData.email });
    } catch (error) {
      logger.error(TAG, 'Error during login:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Clear stored data
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_USER),
      ]);

      if (!isMountedRef.current) return;

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      // Track logout
      analyticsService.trackLogout();
      logger.info(TAG, 'User logged out');
    } catch (error) {
      logger.error(TAG, 'Error during logout:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (userData: AuthUser): Promise<void> => {
    if (!isMountedRef.current) return;

    setUser(userData);

    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_USER, JSON.stringify(userData));
      logger.debug(TAG, 'User data updated');
    } catch (error) {
      logger.error(TAG, 'Failed to persist user data:', error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    token,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
