import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { work_status } from '@remotedays/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCcw, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TablePagination } from '@/components/TablePagination';
import { OverrideEntryDialog } from '@/components/OverrideEntryDialog';
import { ComplianceProgressBar } from '@/components/ComplianceProgressBar';
import { format } from 'date-fns';
import { PageHeader } from '@/components/PageHeader';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';
import { SectionCard } from '@/components/SectionCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export default function EmployeeList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialFilter = searchParams.get('filter') as 'exceeded' | 'critical' | 'high' | 'moderate' | null;

    // Filter State
    const [riskFilter, setRiskFilter] = useState<'exceeded' | 'critical' | 'high' | 'moderate' | 'all'>(initialFilter || 'all');
    const [textFilter, setTextFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Override Dialog State
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);

    const queryClient = useQueryClient();

    // --- Queries ---

    // Fetch daily entries for override functionality
    const { data: dailyEntries, isError: isDailyEntriesError } = useQuery({
        queryKey: ['employees', 'daily', format(new Date(), 'yyyy-MM-dd')],
        queryFn: async () => {
            const res = await api.get<DailyEntry[]>(`/employees/entries/daily?date=${format(new Date(), 'yyyy-MM-dd')}`);
            return res.data;
        },
    });

    // Annual Summary
    const { data: annualSummaries, isLoading: isLoadingAnnual, isError: isAnnualError } = useQuery({
        queryKey: ['employees', 'summary'],
        queryFn: async () => {
            const res = await api.get<EmployeeSummaryType[]>('/employees/summary');
            return res.data;
        },
    });

    // --- Handlers ---

    const handleResetFilters = () => {
        setTextFilter('');
        setRiskFilter('all');
        setPage(1);
        setSearchParams({});
    };

    const handleRiskFilterChange = (value: string) => {
        const filter = value as 'exceeded' | 'critical' | 'high' | 'moderate' | 'all';
        setRiskFilter(filter);
        setPage(1);

        if (filter === 'all') {
            setSearchParams({});
        } else {
            setSearchParams({ filter });
        }
    };

    const handleEditClick = (entry: DailyEntry) => {
        setSelectedEntry(entry);
        setOverrideOpen(true);
    };

    // --- Filtering Logic ---
    const filteredEmployees = useMemo(() => {
        let employees = annualSummaries || [];

        // Apply text filter
        if (textFilter) {
            employees = employees.filter(emp =>
                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(textFilter.toLowerCase())
            );
        }

        // Apply risk filter
        if (riskFilter !== 'all') {
            employees = employees.filter(emp => {
                const pct = Number(emp.percentUsed);
                switch (riskFilter) {
                    case 'exceeded':
                        return pct >= 100;
                    case 'critical':
                        return pct >= 90 && pct < 100;
                    case 'high':
                        return pct >= 75 && pct < 90;
                    case 'moderate':
                        return pct >= 50 && pct < 75;
                    default:
                        return true;
                }
            });
        }

        return employees;
    }, [annualSummaries, textFilter, riskFilter]);

    const todayEntryByUserId = useMemo(() => {
        return new Map((dailyEntries || []).map((entry) => [entry.userId, entry]));
    }, [dailyEntries]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Employees"
                description={
                    riskFilter !== 'all'
                        ? `Showing ${filteredEmployees.length} employees in the ${riskFilter} risk segment.`
                        : `Review all ${filteredEmployees.length} employees and move directly into overrides when today's entry exists.`
                }
                actions={
                    <>
                        <Link to="/hr">
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Hub
                            </Button>
                        </Link>
                        <Button variant="outline" size="icon" onClick={handleResetFilters} title="Reset filters" aria-label="Reset filters">
                            <RefreshCcw className="h-4 w-4" />
                        </Button>
                    </>
                }
            />

            {(isAnnualError || isDailyEntriesError) ? (
                <InlineErrorState description="Employee data is partially unavailable. Refresh to try again." />
            ) : null}

            {/* Filters */}
            <SectionCard
                title="Filters"
                description="Search by employee name and narrow the list by compliance risk."
                contentClassName="pt-6"
            >
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                placeholder="Search employee name..."
                                value={textFilter}
                                onChange={(e) => setTextFilter(e.target.value)}
                            />
                        </div>
                        <Select value={riskFilter} onValueChange={handleRiskFilterChange}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                <SelectItem value="exceeded">Exceeded (100%+)</SelectItem>
                                <SelectItem value="critical">Critical (90-100%)</SelectItem>
                                <SelectItem value="high">High (75-90%)</SelectItem>
                                <SelectItem value="moderate">Moderate (50-75%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
            </SectionCard>

            {/* Employee Table */}
            <SectionCard
                title="Employee Overview"
                description="Desktop shows a dense table. Smaller screens switch to stacked cards with the same actions."
                contentClassName="pt-6"
            >
                    {isLoadingAnnual ? (
                        <TableLoadingState rows={6} />
                    ) : filteredEmployees.length === 0 ? (
                        <TableEmptyState
                            title="No matching employees"
                            description="Adjust the search query or risk filter to broaden the result set."
                        />
                    ) : (
                        <>
                            <div className="hidden lg:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Country</TableHead>
                                        <TableHead>Remote Days Used</TableHead>
                                        <TableHead>Limit</TableHead>
                                        <TableHead>Usage</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="w-[80px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEmployees.slice((page - 1) * pageSize, page * pageSize).map(summary => {
                                        const percentUsed = Number(summary.percentUsed || 0);
                                        const todayEntry = todayEntryByUserId.get(summary.userId);
                                        const getStatusColor = () => {
                                            if (percentUsed >= 100) return 'text-red-600';
                                            if (percentUsed >= 90) return 'text-red-500';
                                            if (percentUsed >= 75) return 'text-orange-600';
                                            if (percentUsed >= 50) return 'text-amber-600';
                                            return 'text-green-600';
                                        };

                                        const getStatusBadge = () => {
                                            if (percentUsed >= 100) return { label: 'EXCEEDED', class: 'bg-red-500 hover:bg-red-600' };
                                            if (percentUsed >= 90) return { label: 'CRITICAL', class: 'bg-red-400 hover:bg-red-500' };
                                            if (percentUsed >= 75) return { label: 'HIGH', class: 'bg-orange-500 hover:bg-orange-600' };
                                            if (percentUsed >= 50) return { label: 'MODERATE', class: 'bg-amber-500 hover:bg-amber-600' };
                                            return { label: 'HEALTHY', class: 'bg-green-500 hover:bg-green-600' };
                                        };

                                        const statusBadge = getStatusBadge();

                                        return (
                                            <TableRow key={summary.userId}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        to={`/hr/employees/${summary.userId}`}
                                                        className="hover:underline"
                                                    >
                                                        {summary.firstName} {summary.lastName}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{summary.workCountry}</TableCell>
                                                <TableCell>{summary.daysUsedCurrentYear}</TableCell>
                                                <TableCell>{summary.maxRemoteDays}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("font-bold text-sm", getStatusColor())}>
                                                                {percentUsed.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <ComplianceProgressBar
                                                            value={summary.daysUsedCurrentYear}
                                                            max={summary.maxRemoteDays}
                                                            showThresholds={false}
                                                            className="w-32"
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={statusBadge.class}>
                                                        {statusBadge.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => todayEntry && handleEditClick(todayEntry)}
                                                                        title="Override today's entry"
                                                                        aria-label={`Override today's entry for ${summary.firstName} ${summary.lastName}`}
                                                                        disabled={!todayEntry}
                                                                    >
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {todayEntry ? 'Override today’s entry' : 'No entry declared today'}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            </div>

                            <div className="grid gap-4 lg:hidden">
                                {filteredEmployees.slice((page - 1) * pageSize, page * pageSize).map((summary) => {
                                    const percentUsed = Number(summary.percentUsed || 0);
                                    const todayEntry = todayEntryByUserId.get(summary.userId);
                                    const badgeTone =
                                        percentUsed >= 100 ? 'bg-red-500 hover:bg-red-600' :
                                        percentUsed >= 90 ? 'bg-red-400 hover:bg-red-500' :
                                        percentUsed >= 75 ? 'bg-orange-500 hover:bg-orange-600' :
                                        percentUsed >= 50 ? 'bg-amber-500 hover:bg-amber-600' :
                                        'bg-green-500 hover:bg-green-600';

                                    return (
                                        <Card key={summary.userId} className="border-border/70 p-4 shadow-sm">
                                            <div className="space-y-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <Link to={`/hr/employees/${summary.userId}`} className="font-semibold hover:underline">
                                                            {summary.firstName} {summary.lastName}
                                                        </Link>
                                                        <p className="text-sm text-muted-foreground">{summary.workCountry} resident threshold</p>
                                                    </div>
                                                    <Badge className={badgeTone}>
                                                        {percentUsed >= 100 ? 'Exceeded' : percentUsed >= 90 ? 'Critical' : percentUsed >= 75 ? 'High' : percentUsed >= 50 ? 'Moderate' : 'Healthy'}
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span>{summary.daysUsedCurrentYear} / {summary.maxRemoteDays} remote days</span>
                                                        <span className="font-semibold">{percentUsed.toFixed(1)}%</span>
                                                    </div>
                                                    <ComplianceProgressBar
                                                        value={summary.daysUsedCurrentYear}
                                                        max={summary.maxRemoteDays}
                                                        showThresholds={false}
                                                    />
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Link to={`/hr/employees/${summary.userId}`}>
                                                        <Button variant="outline" size="sm">View Details</Button>
                                                    </Link>
                                                    {todayEntry ? (
                                                        <Button variant="outline" size="sm" onClick={() => handleEditClick(todayEntry)}>
                                                            <Pencil className="h-4 w-4" />
                                                            Override Today
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" disabled>
                                                            No entry today
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>

                            <div className="mt-4">
                                <TablePagination
                                    currentPage={page}
                                    totalPages={Math.ceil(filteredEmployees.length / pageSize)}
                                    onPageChange={setPage}
                                />
                            </div>
                        </>
                    )}
            </SectionCard>

            <OverrideEntryDialog
                open={overrideOpen}
                onOpenChange={setOverrideOpen}
                entry={selectedEntry}
                date={format(new Date(), 'yyyy-MM-dd')}
                onSuccess={() => {
                    setSelectedEntry(null);
                    queryClient.invalidateQueries({ queryKey: ['employees', 'daily'] });
                }}
            />
        </div>
    );
}
