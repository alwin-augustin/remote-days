import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthUser } from '@remotedays/types';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock SecureStore
jest.mock('expo-secure-store');

// Mock analytics service
jest.mock('../../services/analytics', () => ({
  analyticsService: {
    trackLogin: jest.fn(),
    trackLogout: jest.fn(),
  },
}));

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should load token from SecureStore on mount and set authenticated state', async () => {
    const mockToken = 'mock-jwt-token';
    mockSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'auth_token') return Promise.resolve(mockToken);
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe(mockToken);
  });

  it('should set unauthenticated state when no token exists', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('should provide login function that stores token and updates state', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const mockToken = 'new-token';
    const mockUser: AuthUser = { id: 1, email: 'test@example.com', name: 'Test User', role: 'employee' };

    await act(async () => {
      await result.current.login(mockToken, mockUser);
    });

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', mockToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual(mockUser);
  });

  it('should provide logout function that clears token and updates state', async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'auth_token') return Promise.resolve('existing-token');
      return Promise.resolve(null);
    });
    mockSecureStore.deleteItemAsync.mockResolvedValue();

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('should handle SecureStore errors gracefully', async () => {
    mockSecureStore.getItemAsync.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
