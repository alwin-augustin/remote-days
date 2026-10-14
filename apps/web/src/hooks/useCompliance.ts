import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

// Field names mirror the API contract (`EmployeeStats` in @remotedays/types).
export type ComplianceStats = {
  remoteDaysCount: number;
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
