import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface ProgressBarProps {
  percentage: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({
  percentage,
  color = theme.colors.primary,
  height = 8,
  style,
}: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <View style={[styles.track, { height }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedPercentage}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: theme.borderRadius.full,
  },
});
