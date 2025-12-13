import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import type { work_status } from '@tracker/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, RefreshCcw, Pencil } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { KPICard } from '@/components/KPICard';
import { TablePagination } from '@/components/TablePagination';
import { OverrideEntryDialog } from '@/components/OverrideEntryDialog';

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
    danger_count: number;
    warning_count: number;
    missing_count: number;
}

const STATUS_COLORS: Record<work_status, string> = {
    home: 'bg-green-100 text-green-800 border-green-200',
    office: 'bg-blue-100 text-blue-800 border-blue-200',
    travel: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    sick: 'bg-red-100 text-red-800 border-red-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function EmployeeSummary() {
    const [date, setDate] = useState<Date>(new Date());
    const formattedDate = format(date, 'yyyy-MM-dd');

    // View Mode State
    const [viewMode, setViewMode] = useState<'daily' | 'annual'>('daily');
    const [riskFilter, setRiskFilter] = useState<'danger' | 'warning' | 'missing' | null>(null);

    // Filter State
    const [selectedStatus, setSelectedStatus] = useState<work_status | 'all'>('all');
    const [textFilter, setTextFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Override Dialog State
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);

    const handleEditClick = (entry: DailyEntry) => {
        setSelectedEntry(entry);
        setOverrideOpen(true);
    };

    // --- Queries ---

    // 1. Risk Stats (KPI Cards)
    const { data: riskStats } = useQuery({
        queryKey: ['hr', 'stats', 'risk', formattedDate],
        queryFn: async () => {
            const res = await api.get<RiskStats>(`/hr/stats/risk?date=${formattedDate}`);
            return res.data;
        }
    });

    // 2. Daily Entries (Daily View)
    const { data: dailyEntries, isLoading: isLoadingDaily } = useQuery({
        queryKey: ['hr', 'daily', formattedDate],
        queryFn: async () => {
            const res = await api.get<DailyEntry[]>(`/hr/entries/daily?date=${formattedDate}`);
            return res.data;
        },
        enabled: viewMode === 'daily'
    });

    // 3. Annual Summary (Annual View)
    const { data: annualSummaries, isLoading: isLoadingAnnual } = useQuery({
        queryKey: ['hr', 'summary'],
        queryFn: async () => {
            const res = await api.get<EmployeeSummaryType[]>('/hr/summary');
            return res.data;
        },
        enabled: viewMode === 'annual'
    });

    // --- Handlers ---

    const handleResetFilters = () => {
        setTextFilter('');
        setSelectedStatus('all');
        setRiskFilter(null);
        setViewMode('daily'); // Default back to daily
        setPage(1);
    };

    const handleRiskClick = (riskType: 'danger' | 'warning' | 'missing') => {
        if (riskFilter === riskType) {
            // Toggle off
            handleResetFilters();
        } else {
            // Toggle on
            setRiskFilter(riskType);
            if (riskType === 'danger' || riskType === 'warning') {
                setViewMode('annual');
            } else {
                setViewMode('daily');
                setSelectedStatus('unknown'); // 'unknown' corresponds to Missing
            }
            setPage(1);
        }
    };

    // --- Filtering Logic ---

    // Daily View Filter
    const filteredDaily = dailyEntries?.filter(entry => {
        const matchesText = !textFilter ||
            `${entry.first_name} ${entry.last_name}`.toLowerCase().includes(textFilter.toLowerCase()) ||
            entry.email.toLowerCase().includes(textFilter.toLowerCase());

        let matchesStatus = true;

        if (riskFilter === 'missing') {
            // Explicit missing filter
            matchesStatus = entry.status === 'unknown'; // assuming 'unknown' means no entry or placeholder
        } else if (selectedStatus !== 'all') {
            matchesStatus = entry.status === selectedStatus;
        }

        return matchesText && matchesStatus;
    });

    // Annual View Filter
    const filteredAnnual = annualSummaries?.filter(summary => {
        const matchesText = !textFilter ||
            `${summary.first_name} ${summary.last_name}`.toLowerCase().includes(textFilter.toLowerCase());

        let matchesRisk = true;
        if (riskFilter === 'danger') {
            matchesRisk = summary.traffic_light === 'red';
        } else if (riskFilter === 'warning') {
            matchesRisk = summary.traffic_light === 'orange';
        }

        return matchesText && matchesRisk;
    });

    // Group stats for Daily view (bottom cards)
    const dailyStats = dailyEntries?.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<work_status, number>);


    const isLoading = viewMode === 'daily' ? isLoadingDaily : isLoadingAnnual;
    const activeDataCount = viewMode === 'daily' ? filteredDaily?.length : filteredAnnual?.length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">
                    {viewMode === 'daily' ? 'Daily Status' : 'Annual Risk Overview'}
                </h1>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
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
                    <Button variant="outline" size="icon" onClick={handleResetFilters} title="Reset Filters">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Risk Widgets (KPI Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    title="Danger Zone"
                    count={riskStats?.danger_count || 0}
                    variant="red"
                    isActive={riskFilter === 'danger'}
                    onClick={() => handleRiskClick('danger')}
                />
                <KPICard
                    title="Warning Zone"
                    count={riskStats?.warning_count || 0}
                    variant="orange"
                    isActive={riskFilter === 'warning'}
                    onClick={() => handleRiskClick('warning')}
                />
                <KPICard
                    title="Missing Declarations"
                    count={riskStats?.missing_count || 0}
                    variant="gray"
                    isActive={riskFilter === 'missing'}
                    onClick={() => handleRiskClick('missing')}
                />
            </div>

            {/* Daily Stats Overview (Only in Daily Mode and if no risk filter active) */}
            {viewMode === 'daily' && !riskFilter && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {(['home', 'office', 'travel', 'sick', 'unknown'] as work_status[]).map(status => (
                        <Card
                            key={status}
                            className={cn(
                                "cursor-pointer transition-colors hover:bg-muted/50",
                                selectedStatus === status && "ring-2 ring-primary"
                            )}
                            onClick={() => setSelectedStatus(selectedStatus === status ? 'all' : status)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium capitalize">
                                    {status.replace('_', ' ')}
                                </CardTitle>
                                <div className={cn("w-2 h-2 rounded-full", STATUS_COLORS[status].split(' ')[0].replace('bg-', 'bg-text-'))} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{dailyStats?.[status] || 0}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Employee List Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        {viewMode === 'daily' ? 'Daily Entries' : 'Employees (Annual Usage)'}
                    </CardTitle>
                    <div className="pt-2">
                        <Input
                            placeholder="Search employee..."
                            className="max-w-sm"
                            value={textFilter}
                            onChange={(e) => setTextFilter(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : activeDataCount === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No records found.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    {/* Dynamic Columns based on View Mode */}
                                    {viewMode === 'daily' ? (
                                        <>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Country</TableHead>
                                            <TableHead className="w-[80px]">Action</TableHead>
                                        </>
                                    ) : (
                                        <>
                                            <TableHead>Remote Days Used</TableHead>
                                            <TableHead>Limit</TableHead>
                                            <TableHead>% Used</TableHead>
                                            <TableHead>Risk Level</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {viewMode === 'daily' ? (
                                    filteredDaily?.slice((page - 1) * pageSize, page * pageSize).map(entry => (
                                        <TableRow key={entry.email}>
                                            <TableCell className="font-medium">
                                                {entry.first_name} {entry.last_name}
                                            </TableCell>
                                            <TableCell>{entry.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={STATUS_COLORS[entry.status]}>
                                                    {entry.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{entry.work_country || entry.country_of_residence || '-'}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => handleEditClick(entry)}
                                                    title="Override Entry"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    filteredAnnual?.slice((page - 1) * pageSize, page * pageSize).map(summary => (
                                        <TableRow key={summary.user_id}>
                                            <TableCell className="font-medium">
                                                {summary.first_name} {summary.last_name}
                                                <div className="text-xs text-muted-foreground">{summary.work_country}</div>
                                            </TableCell>
                                            <TableCell>{summary.days_used_current_year}</TableCell>
                                            <TableCell>{summary.max_remote_days}</TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                    "font-bold",
                                                    summary.traffic_light === 'red' ? "text-red-600" :
                                                        summary.traffic_light === 'orange' ? "text-orange-600" : "text-green-600"
                                                )}>
                                                    {summary.percent_used.toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    summary.traffic_light === 'red' ? "bg-red-500 hover:bg-red-600" :
                                                        summary.traffic_light === 'orange' ? "bg-orange-500 hover:bg-orange-600" : "bg-green-500 hover:bg-green-600"
                                                )}>
                                                    {summary.traffic_light.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                    <div className="mt-4">
                        <TablePagination
                            currentPage={page}
                            totalPages={Math.ceil((activeDataCount || 0) / pageSize)}
                            onPageChange={setPage}
                        />
                    </div>
                </CardContent>
            </Card >

            <OverrideEntryDialog
                open={overrideOpen}
                onOpenChange={setOverrideOpen}
                entry={selectedEntry}
                date={formattedDate}
                onSuccess={() => setSelectedEntry(null)}
            />
        </div >
    );
}
