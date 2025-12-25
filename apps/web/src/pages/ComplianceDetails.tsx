import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ComplianceStatusCard } from '@/components/ComplianceStatusCard';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// interface MonthlyBreakdown {
//   month: string;
//   year: number;
//   home_days: number;
//   office_days: number;
//   travel_days: number;
//   sick_days: number;
//   total_work_days: number;
// }

export default function ComplianceDetails() {
  // Fetch user stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await api.get<{
        days_used_current_year: number;
        days_remaining: number;
        percent_used: number
      }>('/entries/stats');
      return res.data;
    },
  });

  // Fetch monthly breakdown (would need new API endpoint)
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['monthly-breakdown'],
    queryFn: async () => {
      // TODO: Create API endpoint for monthly breakdown
      // const res = await api.get<MonthlyBreakdown[]>('/entries/monthly-breakdown');
      // return res.data;

      // Mock data for now
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months.map((month) => ({
        month,
        year: 2025,
        home_days: Math.floor(Math.random() * 5),
        office_days: Math.floor(Math.random() * 15),
        travel_days: Math.floor(Math.random() * 3),
        sick_days: Math.floor(Math.random() * 2),
        total_work_days: 20,
      }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link to="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Details</h1>
          <p className="text-muted-foreground">Detailed breakdown of your remote work usage</p>
        </div>
      </div>

      {/* Main Compliance Card */}
      <div>
        {isLoadingStats ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <ComplianceStatusCard
            daysUsed={stats?.days_used_current_year ?? 0}
            maxDays={34}
            countryCode="FR"
          />
        )}
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingMonthly ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyData?.map((month) => (
                <div
                  key={`${month.month}-${month.year}`}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="font-semibold w-16">{month.month}</div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">🏠</span>
                        <span>{month.home_days}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">🏢</span>
                        <span>{month.office_days}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">✈️</span>
                        <span>{month.travel_days}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">🏥</span>
                        <span>{month.sick_days}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    {month.home_days} remote days
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year-to-Date Summary */}
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
                {stats ? Math.round((stats.days_used_current_year / new Date().getMonth() + 1) * 10) / 10 : 0} days
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
                {stats?.days_remaining ?? 0} days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Months Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {12 - new Date().getMonth()} months
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
