import * as Haptics from 'expo-haptics';

export const hapticService = {
  /**
   * Light impact feedback - for button presses
   */
  light: async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium impact feedback - for successful actions
   */
  medium: async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Heavy impact feedback - for important actions
   */
  heavy: async (): Promise<void> => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /**
   * Success feedback - for successful completions
   */
  success: async (): Promise<void> => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * Warning feedback - for warnings
   */
  warning: async (): Promise<void> => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /**
   * Error feedback - for errors
   */
  error: async (): Promise<void> => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /**
   * Selection feedback - for selection changes
   */
  selection: async (): Promise<void> => {
    await Haptics.selectionAsync();
  },
};
