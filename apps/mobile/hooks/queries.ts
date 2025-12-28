import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Entry, EmployeeStats, LocationType, AuthUser } from '@remotedays/types';
import { locationService, statsService, authService, requestService } from '../services/api';
import { hapticService } from '../services/haptics';
import { analyticsService } from '../services/analytics';
import { offlineService } from '../services/offline';

// Query keys
export const queryKeys = {
  stats: ['stats'] as const,
  entries: ['entries'] as const,
  currentUser: ['currentUser'] as const,
  pendingCount: ['pendingCount'] as const,
};

/**
 * Hook to fetch employee stats
 * Stats refresh frequently to catch admin-approved requests
 */
export function useStats(enabled = true) {
  return useQuery<EmployeeStats>({
    queryKey: queryKeys.stats,
    queryFn: statsService.getMyStats,
    enabled,
    staleTime: 30 * 1000, // 30 seconds - short to catch admin approvals quickly
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when app comes to foreground
    refetchOnReconnect: true, // Refetch when network reconnects
  });
}

/**
 * Hook to fetch entry history
 */
// Pagination hook
export function useAllHistory() {
  const queryClient = useQueryClient();

  // We'll use a simple state-based approach for pagination since useInfiniteQuery 
  // might require more structural changes to how data is merged.
  // Actually, let's stick to the plan: simple query that we can refetch with different params or just fetch big list.
  // Wait, better to use useInfiniteQuery pattern if possible, but let's do a simpler "load more" approach
  // by managing data in component or just one big list for now if data is small?
  // User asked for "Load More". InfiniteQuery is best.

  return useInfiniteQuery({
    queryKey: ['history'],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 10;
      const data = await locationService.getHistory({ limit, offset: pageParam });
      return { data, nextCursor: data.length === limit ? pageParam + 10 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });
}

/**
 * Hook to fetch entry history for monthly view (legacy/home)
 */
export function useEntries(enabled = true) {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed for backend

  return useQuery<Entry[]>({
    queryKey: queryKeys.entries,
    queryFn: () => locationService.getHistory({ year, month }),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch current user
 */
export function useCurrentUser(enabled = true) {
  return useQuery<AuthUser>({
    queryKey: queryKeys.currentUser,
    queryFn: authService.getCurrentUser,
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get today's entry from cache
 */
export function useTodayEntry(entries: Entry[] | undefined): Entry | undefined {
  const today = new Date().toISOString().split('T')[0];
  return entries?.find((e) => e.date === today);
}

/**
 * Hook for declaring location
 */
export function useDeclareLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, location }: { date: string; location: LocationType }) => {
      return locationService.declare({ date, location });
    },
    onSuccess: async (_data, { date, location }) => {
      // Force immediate refetch of stats and entries to update compliance section
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.stats }),
        queryClient.refetchQueries({ queryKey: queryKeys.entries }),
      ]);

      // Haptic feedback
      hapticService.success();

      // Analytics
      analyticsService.trackDeclaration(location, date);
    },
    onError: () => {
      hapticService.error();
    },
  });
}

/**
 * Hook for offline declaration
 */
export function useOfflineDeclare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, location }: { date: string; location: LocationType }) => {
      return offlineService.addToQueue(date, location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingCount });
      hapticService.medium();
    },
  });
}

/**
 * Hook to sync offline queue
 */
export function useSyncOfflineQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: offlineService.syncQueue,
    onSuccess: async ({ success }) => {
      if (success > 0) {
        // Force immediate refetch to update compliance section
        await Promise.all([
          queryClient.refetchQueries({ queryKey: queryKeys.stats }),
          queryClient.refetchQueries({ queryKey: queryKeys.entries }),
          queryClient.refetchQueries({ queryKey: queryKeys.pendingCount }),
        ]);
        hapticService.success();
      }
    },
  });
}

/**
 * Hook to get pending offline entries count
 */
export function usePendingCount() {
  return useQuery({
    queryKey: queryKeys.pendingCount,
    queryFn: offlineService.getPendingCount,
    staleTime: 30 * 1000, // 30 seconds
  });
}
// ... existing code ...

/**
 * Hook to fetch requests
 */
export function useRequests(enabled = true) {
  return useQuery({
    queryKey: ['requests'],
    queryFn: requestService.getMyRequests,
    enabled,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to create a request
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      hapticService.success();
    },
    onError: () => {
      hapticService.error();
    },
  });
}
