import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComplianceStatus } from '@remotedays/types';
import { theme } from '../constants/theme';

// Support both compliance status and request status
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type BadgeStatus = ComplianceStatus | RequestStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

interface StatusConfig {
  color: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const statusConfigs: Record<BadgeStatus, StatusConfig> = {
  // Compliance statuses
  safe: {
    color: theme.colors.success,
    label: 'SAFE',
    icon: 'checkmark-circle',
  },
  warning: {
    color: theme.colors.warning,
    label: 'WARNING',
    icon: 'alert-circle',
  },
  critical: {
    color: theme.colors.error,
    label: 'CRITICAL',
    icon: 'warning',
  },
  exceeded: {
    color: theme.colors.critical,
    label: 'EXCEEDED',
    icon: 'close-circle',
  },
  // Request statuses
  pending: {
    color: theme.colors.warning,
    label: 'PENDING',
    icon: 'time',
  },
  approved: {
    color: theme.colors.success,
    label: 'APPROVED',
    icon: 'checkmark-circle',
  },
  rejected: {
    color: theme.colors.error,
    label: 'REJECTED',
    icon: 'close-circle',
  },
};

const sizeConfigs = {
  small: { iconSize: 14, padding: 6, fontSize: 10 },
  medium: { iconSize: 18, padding: 8, fontSize: 12 },
  large: { iconSize: 22, padding: 12, fontSize: 14 },
};

export function StatusBadge({ status, size = 'medium', style }: StatusBadgeProps) {
  const config = statusConfigs[status];
  const sizeConfig = sizeConfigs[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.color,
          paddingHorizontal: sizeConfig.padding * 1.5,
          paddingVertical: sizeConfig.padding,
        },
        style,
      ]}
    >
      <Ionicons name={config.icon} size={sizeConfig.iconSize} color="#fff" />
      <Text style={[styles.text, { fontSize: sizeConfig.fontSize }]}>
        {config.label}
      </Text>
    </View>
  );
}

export function getStatusColor(status: ComplianceStatus): string {
  return statusConfigs[status].color;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  text: {
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
});
