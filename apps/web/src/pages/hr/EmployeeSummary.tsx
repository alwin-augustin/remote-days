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

type DailyEntry = {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: work_status;
    country_of_residence: string;
    work_country?: string;
}

type EmployeeSummaryType = {
    user_id: string;
    first_name: string;
    last_name: string;
    country_of_residence: string;
    work_country: string;
    days_used_current_year: number;
    max_remote_days: number;
    days_remaining: number;
    percent_used: number;
    traffic_light: 'red' | 'orange' | 'green';
}

type RiskStats = {
    exceeded_count: number;
    critical_count: number;
    high_count: number;
    moderate_count: number;
    missing_count: number;
}

export default function EmployeeSummary() {
    const navigate = useNavigate();
    const [date, setDate] = useState<Date>(new Date());
    const formattedDate = format(date, 'yyyy-MM-dd');

    // --- Queries ---

    // 1. Risk Stats
    const { data: riskStats } = useQuery({
        queryKey: ['hr', 'stats', 'risk', formattedDate],
        queryFn: async () => {
            const res = await api.get<RiskStats>(`/hr/stats/risk?date=${formattedDate}`);
            return res.data;
        }
    });

    // 2. Daily Entries
    const { data: dailyEntries } = useQuery({
        queryKey: ['hr', 'daily', formattedDate],
        queryFn: async () => {
            const res = await api.get<DailyEntry[]>(`/hr/entries/daily?date=${formattedDate}`);
            return res.data;
        },
    });

    // 3. Annual Summary
    const { data: annualSummaries } = useQuery({
        queryKey: ['hr', 'summary'],
        queryFn: async () => {
            const res = await api.get<EmployeeSummaryType[]>('/hr/summary');
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
        const exceededEmployees = annualSummaries?.filter(s => Number(s.percent_used) >= 100) || [];
        exceededEmployees.slice(0, 3).forEach(emp => {
            alerts.push({
                id: `exceeded-${emp.user_id}`,
                type: 'exceeded',
                title: `${emp.first_name} ${emp.last_name} (${emp.work_country})`,
                description: `${emp.days_used_current_year}/${emp.max_remote_days} days used (${Number(emp.percent_used).toFixed(0)}%)`,
                actionLabel: 'View Details',
                onAction: () => handleRiskFilterChange('exceeded'),
            });
        });

        // Critical alerts
        const criticalEmployees = annualSummaries?.filter(s => {
            const pct = Number(s.percent_used);
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
        if (riskStats && riskStats.missing_count > 0) {
            alerts.push({
                id: 'missing',
                type: 'missing',
                title: `${riskStats.missing_count} employees haven't declared today`,
                description: `As of ${format(date, 'PPP')}`,
                actionLabel: 'Send Reminder',
                onAction: () => {
                    // TODO: Implement send reminder
                    alert('Send reminder feature coming soon');
                },
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Team Compliance Dashboard</h1>
                    <p className="text-muted-foreground">Monitor employee compliance and declarations</p>
                </div>
                <div className="flex items-center gap-2">
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
                </div>
            </div>

            {/* Priority Alerts */}
            {priorityAlerts.length > 0 && (
                <PriorityAlertPanel alerts={priorityAlerts} />
            )}

            {/* Risk Distribution Cards */}
            <RiskDistributionCards
                exceededCount={riskStats?.exceeded_count || 0}
                criticalCount={riskStats?.critical_count || 0}
                highCount={riskStats?.high_count || 0}
                moderateCount={riskStats?.moderate_count || 0}
                onFilterChange={handleRiskFilterChange}
                activeFilter={null}
            />

            {/* Daily Declaration Summary */}
            <DailyDeclarationSummary
                date={formattedDate}
                totalEmployees={totalEmployees}
                declared={declaredToday}
                statusCounts={dailyStats}
            />
        </div>
    );
}
