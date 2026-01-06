import { useEffect } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Debug logging helper
const debug = (message: string, data?: unknown) => {
  if (__DEV__) {
    console.log(`[Index] ${message}`, data !== undefined ? data : '');
  }
};

export default function Index() {
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    debug('State:', { isAuthenticated, isLoading, hasNavigationState: !!navigationState?.key });

    // Wait for navigation to be ready
    if (!navigationState?.key) return;
    if (isLoading) return;

    debug('Navigating:', isAuthenticated ? 'to tabs' : 'to login');

    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, navigationState?.key, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
