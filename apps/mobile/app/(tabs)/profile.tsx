import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthUser } from '@remotedays/types';
import { useAuth } from '../../context/AuthContext';
import { useCurrentUser } from '../../hooks';
import { LoadingSpinner, Card, GradientButton } from '../../components';
import { analyticsService } from '../../services/analytics';
import { hapticService } from '../../services/haptics';
import { theme } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user: authUser, logout: authLogout, isLoading: authLoading, isAuthenticated } = useAuth();

  const { data: fetchedUser, isLoading: userLoading } = useCurrentUser(
    isAuthenticated && !authLoading && !authUser
  );

  // Use authUser if available, otherwise use fetched user
  const userData: AuthUser | null = authUser || fetchedUser || null;
  const loading = authLoading || (userLoading && !authUser);

  // Track screen view
  useEffect(() => {
    analyticsService.trackScreen('profile');
  }, []);

  const handleLogout = () => {
    hapticService.warning();
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await authLogout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>
              {userData?.firstName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        </View>
        <Text style={styles.name}>{userData ? `${userData.firstName} ${userData.lastName}` : 'User'}</Text>
        <Text style={styles.email}>{userData?.email || ''}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="person-outline"
            gradient="primary"
            title="Personal Information"
            subtitle={userData?.email || ''}
          />
        </Card>

        {/* App Section */}
        <Text style={styles.sectionTitle}>App</Text>
        <Card style={styles.menuCard}>
          <MenuItem
            icon="information-circle-outline"
            title="About"
            subtitle="Version 1.0.0"
          />
        </Card>

        {/* Logout Button */}
        <GradientButton
          title="Sign Out"
          icon="log-out-outline"
          gradient="danger"
          onPress={handleLogout}
          style={styles.logoutButton}
        />
      </View>
    </ScrollView>
  );
}

// Menu Item Component
interface MenuItemProps {
  icon: string;
  title: string;
  subtitle: string;
  gradient?: 'primary' | 'secondary' | 'success';
  onPress?: () => void;
}

function MenuItem({ icon, title, subtitle, gradient, onPress }: MenuItemProps) {
  const gradientColors = gradient
    ? theme.colors.gradient[gradient]
    : undefined;

  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconContainer}>
        {gradientColors ? (
          <LinearGradient colors={gradientColors} style={styles.menuIconGradient}>
            <Ionicons name={icon as string} size={20} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.menuIconGradient, styles.menuIconGray]}>
            <Ionicons name={icon as string} size={20} color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuText}>{title}</Text>
        <Text style={styles.menuSubtext}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  avatarContainer: {
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    ...theme.typography.h2,
    color: '#fff',
    marginBottom: theme.spacing.xs,
  },
  email: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  menuCard: {
    padding: 0,
    marginBottom: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  menuIconContainer: {
    marginRight: theme.spacing.md,
  },
  menuIconGradient: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconGray: {
    backgroundColor: theme.colors.text.tertiary,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs / 2,
  },
  menuSubtext: {
    ...theme.typography.small,
    color: theme.colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border.light,
    marginHorizontal: theme.spacing.lg,
  },
  logoutButton: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
});
