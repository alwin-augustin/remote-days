import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export type RequestItem = {
  id: number;
  date: string;
  requestedStatus: string;
  status: string;
  reason: string;
  adminNote: string | null;
  createdAt: string;
  // Present in admin view
  userId?: string;
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
};

/** Returns the current user's own requests (role-scoped by backend). */
export function useMyRequests() {
  return useQuery({
    queryKey: queryKeys.requests.mine,
    queryFn: async () => {
      const res = await api.get<{ data: RequestItem[]; total: number }>('/requests');
      return res.data.data;
    },
  });
}

/** Returns all requests visible to HR/Admin (role-scoped by backend). */
export function useAllRequests() {
  return useQuery({
    queryKey: queryKeys.requests.all,
    queryFn: async () => {
      const res = await api.get<{ data: RequestItem[]; total: number }>('/requests');
      return res.data.data;
    },
  });
}
