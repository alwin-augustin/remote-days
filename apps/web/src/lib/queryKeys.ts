export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
  },
  entries: {
    all: (year: string, month: string) => ['entries', year, month] as const,
    byUser: (year: string, month: string, userId: string) => ['entries', year, month, userId] as const,
    daily: (date: string) => ['employees', 'entries', 'daily', date] as const,
  },
  compliance: {
    me: ['compliance', 'me'] as const,
  },
  employees: {
    summary: ['employees', 'summary'] as const,
    riskStats: (date: string) => ['employees', 'stats', 'risk', date] as const,
    dailyStats: (date: string) => ['employees', 'stats', 'daily', date] as const,
  },
  requests: {
    mine: ['requests', 'mine'] as const,
    all: ['requests', 'all'] as const,
  },
  admin: {
    users: ['admin', 'users'] as const,
    holidays: (country?: string) => ['admin', 'holidays', country ?? 'all'] as const,
    countries: ['admin', 'countries'] as const,
    auditLogs: ['admin', 'audit-logs'] as const,
  },
} as const;
