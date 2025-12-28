import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../constants/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
  borderLeftColor?: string;
}

export function Card({
  children,
  style,
  variant = 'default',
  borderLeftColor,
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'outlined' && styles.outlined,
        variant === 'elevated' && styles.elevated,
        borderLeftColor && { borderLeftWidth: 4, borderLeftColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    shadowOpacity: 0,
    elevation: 0,
  },
  elevated: {
    ...theme.shadows.lg,
  },
});
