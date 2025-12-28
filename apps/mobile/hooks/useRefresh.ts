import { useState, useCallback } from 'react';

interface UseRefreshResult {
  refreshing: boolean;
  onRefresh: () => void;
}

export function useRefresh(
  refreshFn: () => Promise<void>
): UseRefreshResult {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshFn().finally(() => {
      setRefreshing(false);
    });
  }, [refreshFn]);

  return { refreshing, onRefresh };
}
