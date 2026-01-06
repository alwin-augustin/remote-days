import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Entry } from '@remotedays/types';
import { useAuth } from '../../context/AuthContext';
import { useAllHistory } from '../../hooks';
import { LoadingSpinner, Header, Card, EmptyState } from '../../components';
import { analyticsService } from '../../services/analytics';
import { theme } from '../../constants/theme';

export default function HistoryScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    data,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useAllHistory();

  // Track screen view
  useEffect(() => {
    analyticsService.trackScreen('history');
  }, []);

  const flattenedData = data?.pages.flatMap((page) => page.data) || [];

  if (authLoading || (isLoading && !flattenedData.length)) {
    return <LoadingSpinner fullScreen />;
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="History"
        subtitle="Your declaration history"
        icon="time-outline"
        showLogo
      />

      <FlatList
        data={flattenedData}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} />
        }
        renderItem={({ item }) => <HistoryCard entry={item} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={{ padding: 16 }}>
              <LoadingSpinner />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No History Yet"
            message="Your declaration history will appear here"
          />
        }
      />
    </View>
  );
}

// Sub-component for history card
function HistoryCard({ entry }: { entry: Entry }) {
  const isHome = entry.location === 'home';
  const gradientColors = isHome
    ? theme.colors.gradient.primary
    : theme.colors.gradient.secondary;

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={gradientColors}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons
            name={isHome ? 'home' : 'business'}
            size={24}
            color="#fff"
          />
        </LinearGradient>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            {isHome ? 'Working from Home' : 'Working from Office'}
          </Text>
          <View style={styles.dateContainer}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={theme.colors.text.tertiary}
            />
            <Text style={styles.cardDate}>{formattedDate}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  list: {
    padding: theme.spacing.lg,
    flexGrow: 1,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cardDate: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
});
