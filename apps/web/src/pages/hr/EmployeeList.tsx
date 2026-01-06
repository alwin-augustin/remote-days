import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { work_status } from '@remotedays/types';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, RefreshCcw, Pencil } from 'lucide-react';
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

    // --- Queries ---

    // Fetch daily entries for override functionality
    const { data: dailyEntries } = useQuery({
        queryKey: ['hr', 'daily', format(new Date(), 'yyyy-MM-dd')],
        queryFn: async () => {
            const res = await api.get<DailyEntry[]>(`/hr/entries/daily?date=${format(new Date(), 'yyyy-MM-dd')}`);
            return res.data;
        },
    });

    // Annual Summary
    const { data: annualSummaries, isLoading: isLoadingAnnual } = useQuery({
        queryKey: ['hr', 'summary'],
        queryFn: async () => {
            const res = await api.get<EmployeeSummaryType[]>('/hr/summary');
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
                `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(textFilter.toLowerCase())
            );
        }

        // Apply risk filter
        if (riskFilter !== 'all') {
            employees = employees.filter(emp => {
                const pct = Number(emp.percent_used);
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/hr">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Employee List</h1>
                    <p className="text-muted-foreground">
                        {riskFilter !== 'all'
                            ? `Showing ${filteredEmployees.length} employees in ${riskFilter} status`
                            : `Showing all ${filteredEmployees.length} employees`
                        }
                    </p>
                </div>
                <Button variant="outline" size="icon" onClick={handleResetFilters} title="Reset Filters">
                    <RefreshCcw className="h-4 w-4" />
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <div className="p-4">
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
                </div>
            </Card>

            {/* Employee Table */}
            <Card>
                <div className="p-6">
                    {isLoadingAnnual ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            No employees found matching your filters.
                        </div>
                    ) : (
                        <>
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
                                        const percentUsed = Number(summary.percent_used || 0);
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
                                            <TableRow key={summary.user_id}>
                                                <TableCell className="font-medium">
                                                    <Link
                                                        to={`/hr/employees/${summary.user_id}`}
                                                        className="hover:underline"
                                                    >
                                                        {summary.first_name} {summary.last_name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>{summary.work_country}</TableCell>
                                                <TableCell>{summary.days_used_current_year}</TableCell>
                                                <TableCell>{summary.max_remote_days}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn("font-bold text-sm", getStatusColor())}>
                                                                {percentUsed.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <ComplianceProgressBar
                                                            value={summary.days_used_current_year}
                                                            max={summary.max_remote_days}
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
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            // Find today's entry for this user
                                                            const todayEntry = dailyEntries?.find(e => e.user_id === summary.user_id);
                                                            if (todayEntry) {
                                                                handleEditClick(todayEntry);
                                                            }
                                                        }}
                                                        title="Override Entry"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <div className="mt-4">
                                <TablePagination
                                    currentPage={page}
                                    totalPages={Math.ceil(filteredEmployees.length / pageSize)}
                                    onPageChange={setPage}
                                />
                            </div>
                        </>
                    )}
                </div>
            </Card>

            <OverrideEntryDialog
                open={overrideOpen}
                onOpenChange={setOverrideOpen}
                entry={selectedEntry}
                date={format(new Date(), 'yyyy-MM-dd')}
                onSuccess={() => setSelectedEntry(null)}
            />
        </div>
    );
}
