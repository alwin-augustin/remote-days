import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export type ComplianceStats = {
  remoteDaysUsed: number;
  remoteDaysLimit: number;
  daysRemaining: number;
  percentageUsed: number;
  status: string;
};

export function useCompliance() {
  return useQuery({
    queryKey: queryKeys.compliance.me,
    queryFn: async () => {
      const res = await api.get<ComplianceStats>('/users/me/compliance');
      return res.data;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}
