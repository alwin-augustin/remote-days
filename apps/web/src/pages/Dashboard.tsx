import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, addWeeks } from 'date-fns';
import { api } from '@/lib/api';
import StatusCard from '@/components/StatusCard';
import { RequestChangeDialog } from "@/components/RequestChangeDialog";
import { ComplianceStatusCard } from '@/components/ComplianceStatusCard';
import { WeekCalendar } from '@/components/WeekCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import type { work_status } from '@remotedays/types';
import { useAuth } from '@/context/AuthContext';
import { InlineErrorState } from '@/components/DataStates';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2 } from 'lucide-react';

type EntryItem = { date: string; status: work_status };
type ComplianceStats = {
    remoteDaysUsed: number;
    remoteDaysLimit: number;
    daysRemaining: number;
    percentageUsed: number;
    status: string;
};

export default function Dashboard() {
    const { user } = useAuth();
    const today = new Date();
    const currentMonth = format(today, 'MM');
    const currentYear = format(today, 'yyyy');
    const todayStr = format(today, 'yyyy-MM-dd');

    const queryClient = useQueryClient();

    // Fetch entries for the current month to find today's status
    const { data: entries, isLoading: isLoadingEntries, isError: isEntriesError } = useQuery({
        queryKey: ['entries', currentYear, currentMonth],
        queryFn: async () => {
            const res = await api.get<{ data: EntryItem[]; total: number }>(`/entries?year=${currentYear}&month=${currentMonth}`);
            return res.data.data;
        },
    });

    // Fetch user compliance stats
    const { data: stats, isLoading: isLoadingStats, isError: isStatsError } = useQuery({
        queryKey: ['compliance', 'me'],
        queryFn: async () => {
            const res = await api.get<ComplianceStats>('/users/me/compliance');
            return res.data;
        },
        staleTime: 30 * 1000, // 30 seconds — short to catch admin approvals quickly
        refetchOnWindowFocus: true,
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
    const countryCode = user?.country_of_residence || user?.work_country;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                description="Declare today’s work location first, then review your remaining compliance allowance."
                actions={
                    currentStatus ? (
                        <RequestChangeDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ['entries', currentYear, currentMonth] })} />
                    ) : undefined
                }
            />

            {currentStatus ? (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <AlertTitle>Today is already declared</AlertTitle>
                    <AlertDescription>
                        Your current status is <span className="font-medium capitalize">{currentStatus}</span>. Use a correction request if that needs to change.
                    </AlertDescription>
                </Alert>
            ) : null}

            <div className="space-y-4">
                {isEntriesError ? (
                    <InlineErrorState description="We couldn't load today's declaration state. Refresh to try again." />
                ) : isLoadingEntries ? (
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-1/3" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </div>
                ) : (
                    <StatusCard currentStatus={currentStatus} />
                )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                <div className="space-y-6">
                    {isStatsError ? (
                        <InlineErrorState description="We couldn't load your compliance summary right now." />
                    ) : isLoadingStats ? (
                        <Skeleton className="h-64 w-full" />
                    ) : (
                        <ComplianceStatusCard
                            daysUsed={stats?.remoteDaysUsed ?? 0}
                            maxDays={stats?.remoteDaysLimit ?? 34}
                            countryCode={countryCode}
                        />
                    )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
        </div>
    );
}
