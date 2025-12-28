import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';
import { logger } from './logger';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    logger.warn('Push notifications require a physical device');
    return null;
  }

  // Check and request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    logger.warn('Push notification permission not granted');
    return null;
  }

  // Get Expo push token
  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'remote-days', // Should match your Expo project ID
    });
    token = pushTokenData.data;
    logger.info('Got Expo push token', { token: token.substring(0, 20) + '...' });
  } catch (error) {
    logger.error('Failed to get Expo push token', error);
    return null;
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });

    await Notifications.setNotificationChannelAsync('daily-status', {
      name: 'Daily Status Reminders',
      description: 'Daily reminders to update your work status',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });

    await Notifications.setNotificationChannelAsync('requests', {
      name: 'Request Updates',
      description: 'Notifications about your request approvals and rejections',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
    });
  }

  return token;
}

/**
 * Register the push token with the backend
 */
export async function registerPushTokenWithBackend(token: string): Promise<boolean> {
  try {
    await api.post('/users/push-token', {
      token,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown Device',
    });
    logger.info('Push token registered with backend');
    return true;
  } catch (error) {
    logger.error('Failed to register push token with backend', error);
    return false;
  }
}

/**
 * Unregister push token (e.g., on logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api.delete('/users/push-token');
    logger.info('Push token unregistered');
  } catch (error) {
    logger.error('Failed to unregister push token', error);
  }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the last notification response (for handling app launch from notification)
 */
export async function getLastNotificationResponseAsync(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  seconds: number = 5
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: { seconds, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
  });
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Dismiss all notifications from notification center
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
