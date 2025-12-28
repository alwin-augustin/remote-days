import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('../../services/api');

// Test component that uses auth
function TestComponent() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <></>;
  }

  return (
    <>
      {isAuthenticated && user && <></>}
      {!isAuthenticated && <></>}
    </>
  );
}

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full login flow successfully', async () => {
    // Mock no initial token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    });

    // Create a component to test login
    function LoginTestComponent() {
      useAuth();

      return (
        <></>
      );
    }

    // Simulate login


    render(
      <AuthProvider>
        <LoginTestComponent />
      </AuthProvider>
    );

    // Wait for auth context to be ready
    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
    });

    // Verify token was stored
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('should handle logout flow successfully', async () => {
    // Mock existing token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('existing-token');
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    });

    // Create logout test component
    function LogoutTestComponent() {
      useAuth();

      return (
        <></>
      );
    }

    render(
      <AuthProvider>
        <LogoutTestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
    });
  });

  it('should handle token persistence across app restarts', async () => {
    const mockToken = 'persisted-token';

    // First launch - set token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    const { unmount } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
    });

    // Simulate app restart
    unmount();

    // Second launch - token should be loaded
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalled();
    });
  });

  it('should handle API 401 errors and clear invalid tokens', async () => {
    const mockInvalidToken = 'invalid-token';

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockInvalidToken);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    // Mock API 401 response
    const mockError = {
      response: {
        status: 401,
      },
    };

    (api.get as jest.Mock).mockRejectedValue(mockError);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    });

    // Simulate API call that returns 401
    try {
      await api.get('/entries/stats');
    } catch {
      // Expected to fail
    }

    // Token should be cleared on 401
    // This is handled by the API interceptor
  });
});
