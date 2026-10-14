import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export type EmployeeSummary = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  countryOfResidence: string;
  workCountry: string;
  daysUsedCurrentYear: number;
  maxRemoteDays: number;
  percentUsed: number;
  trafficLight: string;
};

export type DailyEntry = {
  userId: string;
  firstName: string;
  lastName: string;
  countryOfResidence: string;
  date: string;
  status: string;
};

export type RiskStats = {
  exceededCount: number;
  criticalCount: number;
  warningCount: number;
  safeCount: number;
};

export function useEmployeeSummary() {
  return useQuery({
    queryKey: queryKeys.employees.summary,
    queryFn: async () => {
      const res = await api.get<EmployeeSummary[]>('/employees/summary');
      return res.data;
    },
  });
}

export function useEmployeeDailyEntries(date: string) {
  return useQuery({
    queryKey: queryKeys.entries.daily(date),
    queryFn: async () => {
      const res = await api.get<DailyEntry[]>(`/employees/entries/daily?date=${date}`);
      return res.data;
    },
  });
}

export function useEmployeeRiskStats(date: string) {
  return useQuery({
    queryKey: queryKeys.employees.riskStats(date),
    queryFn: async () => {
      const res = await api.get<RiskStats>(`/employees/stats/risk?date=${date}`);
      return res.data;
    },
  });
}
