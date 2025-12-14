import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import StatusCard from '@/components/StatusCard';
import { RequestChangeDialog } from "@/components/RequestChangeDialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import type { work_status } from '@tracker/types';

export default function Dashboard() {
    const today = new Date();
    const currentMonth = format(today, 'MM');
    const currentYear = format(today, 'yyyy');
    const todayStr = format(today, 'yyyy-MM-dd');

    const queryClient = useQueryClient();

    // Fetch entries for the current month to find today's status
    const { data: entries, isLoading: isLoadingEntries } = useQuery({
        queryKey: ['entries', currentYear, currentMonth],
        queryFn: async () => {
            const res = await api.get<{ date: string; status: work_status }[]>(`/ entries ? year = ${currentYear}& month=${currentMonth} `);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your work location.</p>
                </div>
                <RequestChangeDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['entries', currentYear, currentMonth] })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Status Card - Needs to handle loading internally or we wrap it */}
                <div className="col-span-full lg:col-span-2">
                    {isLoadingEntries ? (
                        <div className="space-y-3">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </div>
                    ) : (
                        <StatusCard currentStatus={currentStatus} />
                    )}
                </div>

                {/* Stats Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Remote Days (Year)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <div className="space-y-4">
                                <Skeleton className="h-8 w-1/2" />
                                <Skeleton className="h-2 w-full rounded-full" />
                                <Skeleton className="h-4 w-1/3 ml-auto" />
                            </div>
                        ) : (
                            <>
                                <div className="text-4xl font-bold">
                                    {stats?.days_used_current_year ?? 0}
                                    <span className="text-sm font-normal text-muted-foreground ml-2">used</span>
                                </div>
                                <div className="mt-4">
                                    <Progress value={stats?.percent_used} className="h-2" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-2 text-right">
                                    {stats?.percent_used?.toFixed(1)}% of allowance
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
