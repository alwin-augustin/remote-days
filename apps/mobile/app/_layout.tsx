import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { ErrorBoundary } from '../components';
import { deepLinkService } from '../services/deepLink';
import { analyticsService } from '../services/analytics';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 minute default
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    // Track app open
    analyticsService.trackAppOpen();

    // Handle initial deep link
    deepLinkService.getInitialUrl().then((url) => {
      if (url) {
        deepLinkService.handleUrl(url);
      }
    });

    // Subscribe to deep links while app is running
    const unsubscribe = deepLinkService.subscribe((url) => {
      deepLinkService.handleUrl(url);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        analyticsService.logError(error, { componentStack: errorInfo.componentStack });
      }}
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </SafeAreaProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
