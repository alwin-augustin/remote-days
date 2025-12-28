import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface ProgressCircleProps {
  percentage: number;
  size?: number;
  borderWidth?: number;
  color?: string;
  label?: string;
  style?: ViewStyle;
}

export function ProgressCircle({
  percentage,
  size = 120,
  borderWidth = 8,
  color = theme.colors.primary,
  label = 'Used',
  style,
}: ProgressCircleProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: color,
        },
        style,
      ]}
    >
      <Text style={[styles.percentage, { color }]}>
        {Math.round(clampedPercentage)}%
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    ...theme.typography.h1,
  },
  label: {
    ...theme.typography.small,
    color: theme.colors.text.secondary,
  },
});
