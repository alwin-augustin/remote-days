import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfMonth, startOfToday, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { work_status } from '@remotedays/types';
import { Loader2, Home, Building, Plane, Stethoscope, HelpCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionCard } from '@/components/SectionCard';
import { InlineErrorState } from '@/components/DataStates';

type Entry = { date: string; status: work_status; id: string };

const STATUS_CONFIG: Record<work_status, { label: string; icon: LucideIcon; color: string; bg: string }> = {
    home: { label: 'Home', icon: Home, color: 'text-green-700', bg: 'bg-green-100' },
    office: { label: 'Office', icon: Building, color: 'text-blue-700', bg: 'bg-blue-100' },
    travel: { label: 'Travel', icon: Plane, color: 'text-yellow-700', bg: 'bg-yellow-100' },
    sick: { label: 'Sick', icon: Stethoscope, color: 'text-red-700', bg: 'bg-red-100' },
    unknown: { label: '?', icon: HelpCircle, color: 'text-gray-700', bg: 'bg-gray-100' },
};

export default function CalendarPage() {
    const [date] = useState<Date>(startOfToday());

    // Track displayed month to fetch appropriate data
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

    const { data: entries, isLoading, isError } = useQuery({
        queryKey: ['entries', format(currentMonth, 'yyyy'), format(currentMonth, 'MM')],
        queryFn: async () => {
            const year = format(currentMonth, 'yyyy');
            const month = format(currentMonth, 'MM');
            const res = await api.get<{ data: Entry[]; total: number }>(`/entries?year=${year}&month=${month}`);
            return res.data.data;
        },
    });

    const getStatusForDate = (day: Date) => {
        if (!entries || !Array.isArray(entries)) return undefined;
        // Format the calendar day to YYYY-MM-DD
        const dayStr = format(day, 'yyyy-MM-dd');

        return entries.find(e => {
            if (!e.date) return false;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const entryDate = e.date as any;

            // Handle if e.date is a Date object (runtime check)
            if (entryDate instanceof Date) {
                return format(entryDate, 'yyyy-MM-dd') === dayStr;
            }

            // Handle if e.date is a string (ISO or YYYY-MM-DD)
            if (typeof entryDate === 'string') {
                return entryDate.includes(dayStr);
            }

            return false;
        })?.status;
    };

    return (
        <div className="space-y-4">
            {isError ? (
                <InlineErrorState description="Calendar data could not be loaded." />
            ) : null}

            <SectionCard
                title="Monthly Overview"
                description="Scan the month at a glance and review each declared work location without leaving the calendar."
                contentClassName="p-0"
            >
                <CardContent className="flex min-h-[calc(100vh-15rem)] justify-center overflow-auto p-0">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Calendar
                            key={entries?.length || 'empty'}
                            mode="single"
                            selected={date}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            className="w-full h-full p-4 overflow-y-auto max-w-4xl mx-auto"
                            classNames={{
                                month: "w-full flex flex-col gap-4",
                                table: "w-full border-collapse",
                                head_row: "flex w-full",
                                head_cell: "text-muted-foreground w-full font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                // Simplified cell classes to avoid conflicts
                                cell: "h-24 w-full p-0 relative focus-within:relative focus-within:z-20",
                                day: "h-24 w-full p-0 font-normal aria-selected:opacity-100"
                            }}
                            components={{
                                // Override DayButton to take full control
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                DayButton: (props: any) => {
                                    const { day, modifiers, ...buttonProps } = props;
                                    const dayDate = day.date;
                                    const status = getStatusForDate(dayDate);
                                    const config = status ? STATUS_CONFIG[status] : null;

                                    return (
                                        <button
                                            {...buttonProps}
                                            className={cn(
                                                "h-full w-full flex flex-col items-center justify-start py-1 border rounded-md hover:bg-accent/50 transition-colors",
                                                modifiers.today ? "border-primary" : "border-border/50",
                                                modifiers.outside ? "opacity-30" : "opacity-100"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                                                modifiers.today ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                                            )}>
                                                {format(dayDate, 'd')}
                                            </span>

                                            {/* STATIC TEST TEXT AS REQUESTED + Dynamic Status */}
                                            {config ? (
                                                <div className={cn("flex flex-col items-center w-[90%] rounded p-1 shadow-sm", config.bg)}>
                                                    <config.icon className={cn("h-4 w-4", config.color)} />
                                                    <span className={cn("text-[9px] font-bold uppercase", config.color)}>{config.label}</span>
                                                </div>
                                            ) : (
                                                <div className="flex-1" />
                                            )}
                                        </button>
                                    );
                                }
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            } as any}
                        />
                    )}
                </CardContent>
            </SectionCard>

            <Card className="border-border/70 shadow-sm">
                <CardContent className="flex flex-wrap items-center justify-center gap-5 py-4 text-xs font-medium text-muted-foreground sm:justify-start">
                    <span className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm" /> Home</span>
                    <span className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm" /> Office</span>
                    <span className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-yellow-500 shadow-sm" /> Travel</span>
                    <span className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" /> Sick</span>
                </CardContent>
            </Card>
        </div>
    );
}
