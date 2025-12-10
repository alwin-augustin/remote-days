import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '@/lib/api';
import StatusCard from '@/components/StatusCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { work_status } from '@tracker/types';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
    const today = new Date();
    const currentMonth = format(today, 'MM');
    const currentYear = format(today, 'yyyy');
    const todayStr = format(today, 'yyyy-MM-dd');

    // Fetch entries for the current month to find today's status
    const { data: entries, isLoading: isLoadingEntries } = useQuery({
        queryKey: ['entries', currentYear, currentMonth],
        queryFn: async () => {
            const res = await api.get<{ date: string; status: work_status }[]>(`/entries?year=${currentYear}&month=${currentMonth}`);
            return res.data;
        },
    });

    // Fetch user stats
    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['stats'],
        queryFn: async () => {
            const res = await api.get<{ days_used_current_year: number; days_remaining: number; percent_used: number }>('/entries/stats');
            return res.data;
        },
    });

    const getTodayStatus = () => {
        if (!entries) return undefined;
        const entry = entries.find(e => {
            const d = typeof e.date === 'string' ? e.date.substring(0, 10) : '';
            return d === todayStr;
        });
        return entry?.status;
    }

    const currentStatus = getTodayStatus();

    if (isLoadingEntries || isLoadingStats) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Status Card */}
                <div className="col-span-full lg:col-span-2">
                    <StatusCard currentStatus={currentStatus} />
                </div>

                {/* Stats Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Remote Days (Year)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">
                            {stats?.days_used_current_year ?? 0}
                            <span className="text-sm font-normal text-muted-foreground ml-2">used</span>
                        </div>
                        {/* <p className="text-xs text-muted-foreground mt-2">
              {stats?.days_remaining} days remaining (limit based on country)
            </p> */}
                        <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(stats?.percent_used || 0, 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-right">
                            {stats?.percent_used?.toFixed(1)}% of allowance
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
