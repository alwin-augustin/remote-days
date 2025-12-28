import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  showLogo?: boolean;
  rightContent?: ReactNode;
  style?: ViewStyle;
}

export function Header({
  title,
  subtitle,
  icon,
  showLogo = false,
  rightContent,
  style,
}: HeaderProps) {
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryDark]}
      style={[styles.header, style]}
    >
      <View style={styles.headerContent}>
        {showLogo ? (
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.iconContainer}>
            {icon && <Ionicons name={icon as string} size={28} color="#fff" />}
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
            </View>
          </View>
        )}
        {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: '#fff',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rightContent: {
    marginLeft: theme.spacing.md,
  },
});
