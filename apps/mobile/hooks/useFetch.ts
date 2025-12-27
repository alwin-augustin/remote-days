import { useState, useEffect, useCallback } from 'react';

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  mutate: (newData: T | null) => void;
}

interface UseFetchOptions {
  enabled?: boolean;
  onSuccess?: <T>(data: T) => void;
  onError?: (error: Error) => void;
}

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { enabled = true, onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [enabled, fetcher, onSuccess, onError]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const mutate = useCallback((newData: T | null) => {
    setData(newData);
  }, []);

  return { data, loading, error, refresh, mutate };
}
