import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceStatusCard } from '@/components/ComplianceStatusCard';
import { useAuth } from '@/context/AuthContext';
import { InlineErrorState } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';

type ComplianceStats = {
    remoteDaysUsed: number;
    remoteDaysLimit: number;
    daysRemaining: number;
    percentageUsed: number;
    status: string;
};

export default function ComplianceDetails() {
  const { user } = useAuth();
  // Fetch user compliance stats
  const { data: stats, isLoading: isLoadingStats, isError } = useQuery({
    queryKey: ['compliance', 'me'],
    queryFn: async () => {
      const res = await api.get<ComplianceStats>('/users/me/compliance');
      return res.data;
    },
  });
  const countryCode = user?.country_of_residence || user?.work_country;
  const currentMonthIndex = new Date().getMonth() + 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Review your verified allowance usage and the pace required to stay within the annual threshold."
      />

      {isError ? (
        <InlineErrorState description="Compliance data is unavailable right now. Try refreshing the page." />
      ) : isLoadingStats ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <ComplianceStatusCard
          daysUsed={stats?.remoteDaysUsed ?? 0}
          maxDays={stats?.remoteDaysLimit ?? 34}
          countryCode={countryCode}
        />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average per Month</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats ? Math.round((stats.remoteDaysUsed / currentMonthIndex) * 10) / 10 : 0} days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Days Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.daysRemaining ?? 0} days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Limit Context</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.remoteDaysLimit ?? 0} days</div>
                <p className="text-sm text-muted-foreground">
                  Verified annual allowance
                  {countryCode ? ` for ${countryCode}` : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
