import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import type { work_status } from '@remotedays/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { RiskDistributionCards } from '@/components/RiskDistributionCards';
import { PriorityAlertPanel } from '@/components/PriorityAlertPanel';
import { DailyDeclarationSummary } from '@/components/DailyDeclarationSummary';
import { PageHeader } from '@/components/PageHeader';
import { InlineErrorState, TableLoadingState } from '@/components/DataStates';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SectionCard } from '@/components/SectionCard';

type DailyEntry = {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    status: work_status;
    countryOfResidence: string;
    workCountry?: string;
}

type EmployeeSummaryType = {
    userId: string;
    firstName: string;
    lastName: string;
    countryOfResidence: string;
    workCountry: string;
    daysUsedCurrentYear: number;
    maxRemoteDays: number;
    daysRemaining: number;
    percentUsed: number;
    trafficLight: 'red' | 'orange' | 'green';
}

type RiskStats = {
    exceededCount: number;
    criticalCount: number;
    highCount: number;
    moderateCount: number;
    missingCount: number;
}

export default function EmployeeSummary() {
    const navigate = useNavigate();
    const [date, setDate] = useState<Date>(new Date());
    const formattedDate = format(date, 'yyyy-MM-dd');

    // --- Queries ---

    // 1. Risk Stats
    const { data: riskStats, isLoading: isLoadingRiskStats, isError: isRiskStatsError } = useQuery({
        queryKey: ['employees', 'stats', 'risk', formattedDate],
        queryFn: async () => {
            const res = await api.get<RiskStats>(`/employees/stats/risk?date=${formattedDate}`);
            return res.data;
        }
    });

    // 2. Daily Entries
    const { data: dailyEntries, isLoading: isLoadingDailyEntries, isError: isDailyEntriesError } = useQuery({
        queryKey: ['employees', 'daily', formattedDate],
        queryFn: async () => {
            const res = await api.get<DailyEntry[]>(`/employees/entries/daily?date=${formattedDate}`);
            return res.data;
        },
    });

    // 3. Annual Summary
    const { data: annualSummaries, isLoading: isLoadingSummaries, isError: isSummariesError } = useQuery({
        queryKey: ['employees', 'summary'],
        queryFn: async () => {
            const res = await api.get<EmployeeSummaryType[]>('/employees/summary');
            return res.data;
        },
    });

    // --- Handlers ---

    const handleRiskFilterChange = useCallback((filter: 'exceeded' | 'critical' | 'high' | 'moderate' | null) => {
        if (filter) {
            navigate(`/hr/employees?filter=${filter}`);
        } else {
            navigate('/hr/employees');
        }
    }, [navigate]);

    // --- Priority Alerts ---
    const priorityAlerts = useMemo(() => {
        const alerts: Array<{
            id: string;
            type: 'exceeded' | 'critical' | 'missing';
            title: string;
            description: string;
            actionLabel: string;
            onAction: () => void;
        }> = [];

        // Exceeded limit alerts
        const exceededEmployees = annualSummaries?.filter(s => Number(s.percentUsed) >= 100) || [];
        exceededEmployees.slice(0, 3).forEach(emp => {
            alerts.push({
                id: `exceeded-${emp.userId}`,
                type: 'exceeded',
                title: `${emp.firstName} ${emp.lastName} (${emp.workCountry})`,
                description: `${emp.daysUsedCurrentYear}/${emp.maxRemoteDays} days used (${Number(emp.percentUsed).toFixed(0)}%)`,
                actionLabel: 'View Details',
                onAction: () => handleRiskFilterChange('exceeded'),
            });
        });

        // Critical alerts
        const criticalEmployees = annualSummaries?.filter(s => {
            const pct = Number(s.percentUsed);
            return pct >= 90 && pct < 100;
        }) || [];
        if (criticalEmployees.length > 0) {
            alerts.push({
                id: 'critical-summary',
                type: 'critical',
                title: `${criticalEmployees.length} employees in critical zone`,
                description: '90-100% of allowance used. Will likely exceed soon.',
                actionLabel: 'View List',
                onAction: () => handleRiskFilterChange('critical'),
            });
        }

        // Missing declarations
        if (riskStats && riskStats.missingCount > 0) {
            alerts.push({
                id: 'missing',
                type: 'missing',
                title: `${riskStats.missingCount} employees haven't declared`,
                description: `As of ${format(date, 'PPP')}. Follow up directly from the employee list.`,
                actionLabel: 'Review employees',
                onAction: () => handleRiskFilterChange(null),
            });
        }

        return alerts;
    }, [annualSummaries, riskStats, date, handleRiskFilterChange]);

    // --- Daily Stats ---
    const dailyStats = useMemo(() => {
        if (!dailyEntries) return {};
        return dailyEntries.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {} as Record<work_status, number>);
    }, [dailyEntries]);

    const totalEmployees = annualSummaries?.length || 0;
    const declaredToday = (Object.values(dailyStats) as number[]).reduce((sum: number, count: number) => sum + count, 0) - ((dailyStats as Record<work_status, number>).unknown || 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Compliance Hub"
                description="Review missing declarations, focus on risk tiers, and move quickly into employee investigation."
                actions={
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => d && setDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                }
            />

            {(isRiskStatsError || isDailyEntriesError || isSummariesError) ? (
                <InlineErrorState description="Some HR dashboard data could not be loaded. Refresh to try again." />
            ) : null}

            {(isLoadingRiskStats || isLoadingDailyEntries || isLoadingSummaries) ? (
                <TableLoadingState rows={4} />
            ) : null}

            {/* Priority Alerts */}
            {!isLoadingRiskStats && !isLoadingSummaries && priorityAlerts.length > 0 && (
                <PriorityAlertPanel alerts={priorityAlerts} />
            )}

            {/* Risk Distribution Cards */}
            {!isLoadingRiskStats ? (
                <RiskDistributionCards
                    exceededCount={riskStats?.exceededCount || 0}
                    criticalCount={riskStats?.criticalCount || 0}
                    highCount={riskStats?.highCount || 0}
                    moderateCount={riskStats?.moderateCount || 0}
                    onFilterChange={handleRiskFilterChange}
                    activeFilter={null}
                />
            ) : null}

            {/* Daily Declaration Summary */}
            {!isLoadingDailyEntries && !isLoadingSummaries ? (
                <DailyDeclarationSummary
                    date={formattedDate}
                    totalEmployees={totalEmployees}
                    declared={declaredToday}
                    statusCounts={dailyStats}
                />
            ) : null}

            {!isLoadingRiskStats && (riskStats?.missingCount || 0) > 0 ? (
                <SectionCard
                    title="Follow-up guidance"
                    description="Reminder delivery is not available in the current API. Use the employee list to contact missing employees directly."
                    contentClassName="pt-6"
                >
                    <Alert>
                        <AlertDescription>
                            Open the employee list to review declarations and coordinate reminders manually for employees who have not declared.
                        </AlertDescription>
                    </Alert>
                </SectionCard>
            ) : null}
        </div>
    );
}
