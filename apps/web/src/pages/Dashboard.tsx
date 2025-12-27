import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addWeeks } from 'date-fns';
import { api } from '@/lib/api';
import StatusCard from '@/components/StatusCard';
import { RequestChangeDialog } from "@/components/RequestChangeDialog";
import { ComplianceStatusCard } from '@/components/ComplianceStatusCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import type { work_status } from '@remotedays/types';

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your work location.</p>
                </div>
                <RequestChangeDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['entries', currentYear, currentMonth] })} />
            </div>

            {/* Status Card */}
            <div>
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

            {/* Compliance Status Card */}
            <div>
                {isLoadingStats ? (
                    <Skeleton className="h-64 w-full" />
                ) : (
                    <ComplianceStatusCard
                        daysUsed={stats?.days_used_current_year ?? 0}
                        maxDays={34}
                        countryCode="FR"
                    />
                )}
            </div>

            {/* Week Calendars */}
            <div className="grid gap-4 md:grid-cols-2">
                {isLoadingEntries ? (
                    <>
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </>
                ) : (
                    <>
                        <WeekCalendar entries={entries || []} startDate={today} title="This Week" />
                        <WeekCalendar entries={entries || []} startDate={addWeeks(today, 1)} title="Next Week" />
                    </>
                )}
            </div>
        </div>
    );
}
