import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { work_status } from '@remotedays/types';

export type EntryItem = { date: string; status: work_status };

export function useEntries(year: string, month: string) {
  return useQuery({
    queryKey: queryKeys.entries.all(year, month),
    queryFn: async () => {
      const res = await api.get<{ data: EntryItem[]; total: number }>(
        `/entries?year=${year}&month=${month}`
      );
      return res.data.data;
    },
  });
}

export function useUserEntries(year: string, month: string, userId: string) {
  return useQuery({
    queryKey: queryKeys.entries.byUser(year, month, userId),
    queryFn: async () => {
      const res = await api.get<{ data: EntryItem[]; total: number }>(
        `/entries?year=${year}&month=${month}&user_id=${userId}`
      );
      return res.data.data;
    },
    enabled: !!userId,
  });
}
