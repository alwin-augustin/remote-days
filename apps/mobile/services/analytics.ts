import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsEvent, AnalyticsEventType } from '@remotedays/types';

const ANALYTICS_QUEUE_KEY = 'analytics_queue';
const MAX_QUEUE_SIZE = 100;

interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
}

const config: AnalyticsConfig = {
  enabled: true,
  debug: __DEV__,
};

export const analyticsService = {
  /**
   * Configure analytics settings
   */
  configure: (options: Partial<AnalyticsConfig>): void => {
    Object.assign(config, options);
  },

  /**
   * Track an analytics event
   */
  track: async (
    type: AnalyticsEventType,
    properties?: Record<string, unknown>
  ): Promise<void> => {
    if (!config.enabled) return;

    const event: AnalyticsEvent = {
      type,
      properties,
      timestamp: new Date().toISOString(),
    };

    if (config.debug) {
      console.log('[Analytics]', type, properties);
    }

    // Queue event for batch sending
    await analyticsService.queueEvent(event);
  },

  /**
   * Log an error event
   */
  logError: async (
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> => {
    await analyticsService.track('error', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      ...context,
    });
  },

  /**
   * Track screen view
   */
  trackScreen: async (screenName: string): Promise<void> => {
    await analyticsService.track('screen_view', { screen: screenName });
  },

  /**
   * Queue event for later sending
   */
  queueEvent: async (event: AnalyticsEvent): Promise<void> => {
    try {
      const queueData = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      const queue: AnalyticsEvent[] = queueData ? JSON.parse(queueData) : [];

      // Limit queue size
      if (queue.length >= MAX_QUEUE_SIZE) {
        queue.shift(); // Remove oldest event
      }

      queue.push(event);
      await AsyncStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to queue analytics event:', error);
    }
  },

  /**
   * Get queued events
   */
  getQueuedEvents: async (): Promise<AnalyticsEvent[]> => {
    try {
      const data = await AsyncStorage.getItem(ANALYTICS_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get analytics queue:', error);
      return [];
    }
  },

  /**
   * Clear analytics queue
   */
  clearQueue: async (): Promise<void> => {
    await AsyncStorage.removeItem(ANALYTICS_QUEUE_KEY);
  },

  /**
   * Flush queued events to server (placeholder for real implementation)
   */
  flush: async (): Promise<void> => {
    const events = await analyticsService.getQueuedEvents();

    if (events.length === 0) return;

    if (config.debug) {
      console.log('[Analytics] Flushing', events.length, 'events');
    }

    // In production, you would send these to your analytics backend
    // await api.post('/analytics/events', { events });

    await analyticsService.clearQueue();
  },

  /**
   * Track app lifecycle events
   */
  trackAppOpen: async (): Promise<void> => {
    await analyticsService.track('app_open');
  },

  trackLogin: async (userId: number): Promise<void> => {
    await analyticsService.track('login', { userId });
  },

  trackLogout: async (): Promise<void> => {
    await analyticsService.track('logout');
  },

  trackDeclaration: async (location: 'home' | 'office', date: string): Promise<void> => {
    await analyticsService.track('declare_location', { location, date });
  },
};
