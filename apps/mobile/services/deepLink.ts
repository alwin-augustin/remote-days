import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import api from './api';
import { analyticsService } from './analytics';

// Deep link scheme: remotedays://
// Supported paths:
// - remotedays://declare/home?date=YYYY-MM-DD
// - remotedays://declare/office?date=YYYY-MM-DD
// - remotedays://cta?token=xxx (one-click action from email)

interface DeepLinkParams {
  path: string;
  queryParams: Record<string, string>;
}

export const deepLinkService = {
  /**
   * Parse a deep link URL
   */
  parseUrl: (url: string): DeepLinkParams | null => {
    try {
      const parsed = Linking.parse(url);
      return {
        path: parsed.path || '',
        queryParams: (parsed.queryParams as Record<string, string>) || {},
      };
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  },

  /**
   * Handle incoming deep link
   */
  handleUrl: async (url: string): Promise<void> => {
    try {
      const params = deepLinkService.parseUrl(url);
      if (!params) return;

      const { path, queryParams } = params;

      // Handle CTA token (one-click declaration from email)
      if (path === 'cta' && queryParams.token) {
        await deepLinkService.handleCta(queryParams.token);
        return;
      }

      // Handle direct declaration links
      if (path.startsWith('declare/')) {
        const location = path.replace('declare/', '') as 'home' | 'office';
        const date = queryParams.date || new Date().toISOString().split('T')[0];
        await deepLinkService.handleDeclare(location, date);
        return;
      }

      // Handle navigation links
      switch (path) {
        case 'history':
          router.push('/(tabs)/history');
          break;
        case 'profile':
          router.push('/(tabs)/profile');
          break;
        default:
          router.push('/(tabs)');
      }
    } catch (error) {
      console.error('Deep link handling failed:', error);
      Alert.alert('Error', 'Failed to process the link');
    }
  },

  /**
   * Handle CTA token from email
   */
  handleCta: async (token: string): Promise<void> => {
    try {
      const response = await api.post('/cta/validate', { token });
      const { location, date } = response.data;

      Alert.alert(
        'Declaration Confirmed',
        `Successfully declared ${location === 'home' ? 'Home' : 'Office'} for ${date}`,
        [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
      );

      analyticsService.trackDeclaration(location, date);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid or expired link';
      Alert.alert('Error', message);
    }
  },

  /**
   * Handle direct declaration
   */
  handleDeclare: async (location: 'home' | 'office', date: string): Promise<void> => {
    try {
      await api.post('/entries', { date, location });

      Alert.alert(
        'Declaration Successful',
        `Declared ${location === 'home' ? 'Home' : 'Office'} for ${date}`,
        [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
      );

      analyticsService.trackDeclaration(location, date);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to declare location';
      Alert.alert('Error', errorMessage);
    }
  },

  /**
   * Get the initial URL that launched the app
   */
  getInitialUrl: async (): Promise<string | null> => {
    try {
      const url = await Linking.getInitialURL();
      return url;
    } catch (error) {
      console.error('Failed to get initial URL:', error);
      return null;
    }
  },

  /**
   * Subscribe to incoming deep links
   */
  subscribe: (callback: (url: string) => void): (() => void) => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      callback(url);
    });

    return () => {
      subscription.remove();
    };
  },

  /**
   * Create a deep link URL
   */
  createUrl: (path: string, params?: Record<string, string>): string => {
    return Linking.createURL(path, { queryParams: params });
  },
};
