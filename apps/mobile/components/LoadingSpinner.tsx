import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function LoadingSpinner({
  size = 'large',
  color = theme.colors.primary,
  fullScreen = false,
  style,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, style]}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
});
