import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthUser } from '@remotedays/types';
import { STORAGE_KEYS } from '../constants/storage';
import { analyticsService } from '../services/analytics';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.AUTH_USER),
      ]);

      if (storedToken) {
        setToken(storedToken);
        setIsAuthenticated(true);

        // Restore user data if available
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser) as AuthUser;
            setUser(parsedUser);
          } catch {
            // Invalid stored user data, will be fetched fresh
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (newToken: string, userData: AuthUser) => {
    try {
      // Store token and user data
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, newToken),
        SecureStore.setItemAsync(STORAGE_KEYS.AUTH_USER, JSON.stringify(userData)),
      ]);

      setToken(newToken);
      setUser(userData);
      setIsAuthenticated(true);

      // Track login
      analyticsService.trackLogin(userData.id);
    } catch (error) {
      console.error('Error during login:', error);
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

      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      // Track logout
      analyticsService.trackLogout();
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (userData: AuthUser) => {
    setUser(userData);
    // Persist updated user data
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_USER, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to persist user data:', error);
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
