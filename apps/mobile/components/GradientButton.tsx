import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '../constants/theme';

type GradientPreset = 'primary' | 'secondary' | 'success' | 'danger';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  gradient?: GradientPreset;
  customColors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
}

const gradientPresets: Record<GradientPreset, readonly [string, string]> = {
  primary: theme.colors.gradient.primary,
  secondary: theme.colors.gradient.secondary,
  success: theme.colors.gradient.success,
  danger: ['#EF4444', '#DC2626'] as const,
};

export function GradientButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconSize = 24,
  gradient = 'primary',
  customColors,
  style,
  textStyle,
  hapticFeedback = true,
}: GradientButtonProps) {
  const colors = customColors || gradientPresets[gradient];

  const handlePress = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={colors}
        style={[styles.gradient, disabled && styles.disabled]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={iconSize} color="#fff" />}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: '#fff',
  },
});
