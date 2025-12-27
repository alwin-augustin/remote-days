import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LocationType, Entry } from '@remotedays/types';
import { getComplianceStatus, getPercentageUsed, getDaysRemaining } from '@remotedays/shared';
import { useAuth } from '../../context/AuthContext';
import {
  useStats,
  useEntries,
  useTodayEntry,
  useDeclareLocation,
  useNetworkStatus,
  usePendingCount,
  useSyncOfflineQueue,
  useOfflineDeclare,
} from '../../hooks';
import {
  LoadingSpinner,
  Header,
  Card,
  GradientButton,
  StatusBadge,
  ProgressCircle,
  ProgressBar,
  getStatusColor,
} from '../../components';
import { analyticsService } from '../../services/analytics';
import { theme } from '../../constants/theme';

// Debug logging helper
const debug = (message: string, data?: unknown) => {
  if (__DEV__) {
    console.log(`[HomeScreen] ${message}`, data !== undefined ? data : '');
  }
};

export default function HomeScreen() {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();
  const { isConnected } = useNetworkStatus();

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useStats(isAuthenticated && !authLoading);

  const {
    data: entries,
    isLoading: entriesLoading,
    error: entriesError,
    refetch: refetchEntries,
  } = useEntries(isAuthenticated && !authLoading);

  const { data: pendingCount = 0 } = usePendingCount();

  // Mutations
  const declareMutation = useDeclareLocation();
  const offlineMutation = useOfflineDeclare();
  const syncMutation = useSyncOfflineQueue();

  // Computed values
  const todayEntry = useTodayEntry(entries);
  const loading = authLoading || statsLoading || entriesLoading;
  const declaring = declareMutation.isPending || offlineMutation.isPending;

  // Debug logging
  useEffect(() => {
    debug('Auth state:', { isAuthenticated, authLoading, hasToken: !!token });
    debug('Stats:', stats);
    debug('Entries:', entries?.length);
    if (statsError) debug('Stats error:', statsError);
    if (entriesError) debug('Entries error:', entriesError);
    analyticsService.trackScreen('home');
  }, [isAuthenticated, authLoading, token, stats, entries, statsError, entriesError]);

  // Sync offline entries when back online
  useEffect(() => {
    if (isConnected && pendingCount > 0) {
      debug('Syncing offline entries:', pendingCount);
      syncMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, pendingCount]);

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchEntries()]);
  };

  const handleDeclare = (location: LocationType) => {
    const date = new Date().toISOString().split('T')[0];
    debug('Declaring location:', { location, date, isConnected, hasToken: !!token });

    if (!isConnected) {
      debug('Offline mode - queueing declaration');
      offlineMutation.mutate(
        { date, location },
        {
          onSuccess: () => {
            debug('Offline declaration queued successfully');
            Alert.alert(
              'Saved Offline',
              `Your ${location === 'home' ? 'Home' : 'Office'} declaration will be synced when you're back online.`
            );
          },
          onError: (error: Error) => {
            debug('Offline declaration failed:', error);
          },
        }
      );
      return;
    }

    declareMutation.mutate(
      { date, location },
      {
        onSuccess: (data) => {
          debug('Declaration successful:', data);
          Alert.alert(
            'Success',
            `Declared ${location === 'home' ? 'Home' : 'Office'} for today`
          );
        },
        onError: (error: any) => {
          debug('Declaration failed:', error);
          if (error.status === 409 || error.response?.status === 409) {
            Alert.alert('Status already declared', 'You have already declared your status for today.');
          } else {
            Alert.alert('Error', error.message || 'Failed to declare location');
          }
        },
      }
    );
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Safe extraction of stats with defaults
  const remoteDaysCount = stats?.remoteDaysCount ?? 0;
  const remoteDaysLimit = stats?.remoteDaysLimit ?? 34; // Default to France limit

  const complianceStatus = getComplianceStatus(remoteDaysCount, remoteDaysLimit);
  const percentage = getPercentageUsed(remoteDaysCount, remoteDaysLimit);
  const daysRemaining = getDaysRemaining(remoteDaysCount, remoteDaysLimit);
  const statusColor = getStatusColor(complianceStatus);

  debug('Computed stats:', { remoteDaysCount, remoteDaysLimit, percentage, daysRemaining });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={declareMutation.isPending}
          onRefresh={handleRefresh}
        />
      }
    >
      <Header title="Remote Days" subtitle="Employee Portal" showLogo />

      <View style={styles.content}>
        {/* Offline/Pending Indicator */}
        {(!isConnected || pendingCount > 0) && (
          <Card style={styles.offlineCard}>
            <View style={styles.offlineContent}>
              <Ionicons
                name={isConnected ? 'cloud-upload-outline' : 'cloud-offline-outline'}
                size={20}
                color={theme.colors.warning}
              />
              <Text style={styles.offlineText}>
                {!isConnected
                  ? 'You are offline. Changes will sync when connected.'
                  : `${pendingCount} pending ${pendingCount === 1 ? 'entry' : 'entries'} to sync`}
              </Text>
            </View>
          </Card>
        )}

        {/* Today's Status Card */}
        {todayEntry ? (
          <TodayCard entry={todayEntry} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Where are you working today?</Text>
            <View style={styles.buttonContainer}>
              <GradientButton
                title="Working from Home"
                icon="home"
                iconSize={32}
                gradient="primary"
                onPress={() => handleDeclare('home')}
                disabled={declaring}
                loading={declaring && declareMutation.variables?.location === 'home'}
              />
              <GradientButton
                title="Working from Office"
                icon="business"
                iconSize={32}
                gradient="secondary"
                onPress={() => handleDeclare('office')}
                disabled={declaring}
                loading={declaring && declareMutation.variables?.location === 'office'}
              />
            </View>
          </>
        )}

        {/* Compliance Stats - Always show with defaults */}
        <Text style={styles.sectionTitle}>Compliance Status</Text>
        <Card style={styles.statsCard}>
          <View style={styles.statusBadgeContainer}>
            <StatusBadge status={complianceStatus} size="large" />
          </View>

          <View style={styles.progressSection}>
            <ProgressCircle percentage={percentage} color={statusColor} />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{remoteDaysCount}</Text>
              <Text style={styles.statLabel}>Days Used</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: statusColor }]}>
                {daysRemaining}
              </Text>
              <Text style={styles.statLabel}>Days Left</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{remoteDaysLimit}</Text>
              <Text style={styles.statLabel}>Total Limit</Text>
            </View>
          </View>

          <ProgressBar
            percentage={percentage}
            color={statusColor}
            style={styles.progressBar}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

// Sub-component for today's entry card
function TodayCard({ entry }: { entry: Entry }) {
  const isHome = entry.location === 'home';

  return (
    <Card borderLeftColor={theme.colors.success}>
      <View style={styles.todayHeader}>
        <Ionicons
          name={isHome ? 'home' : 'business'}
          size={24}
          color={theme.colors.primary}
        />
        <Text style={styles.todayTitle}>Today's Declaration</Text>
      </View>
      <Text style={styles.todayLocation}>
        {isHome ? 'Working from Home' : 'Working from Office'}
      </Text>
      <Text style={styles.todayTime}>
        Declared at{' '}
        {new Date(entry.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
  offlineCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    marginBottom: theme.spacing.md,
  },
  offlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  offlineText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    flex: 1,
  },
  statsCard: {
    marginBottom: theme.spacing.xl,
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border.light,
  },
  statValue: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  progressBar: {
    marginTop: theme.spacing.sm,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  todayTitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayLocation: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  todayTime: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
  },
});
