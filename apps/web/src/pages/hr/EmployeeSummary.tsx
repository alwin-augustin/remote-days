import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import type { work_status } from '@tracker/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar as CalendarIcon, Filter } from 'lucide-react';
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

type DailyEntry = {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: work_status;
    country_of_residence: string;
    work_country?: string;
}

const STATUS_COLORS: Record<work_status, string> = {
    home: 'bg-green-100 text-green-800 border-green-200',
    office: 'bg-blue-100 text-blue-800 border-blue-200',
    travel: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    sick: 'bg-red-100 text-red-800 border-red-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200',
};

import { TablePagination } from '@/components/TablePagination';

export default function EmployeeSummary() {
    const [date, setDate] = useState<Date>(new Date());
    const formattedDate = format(date, 'yyyy-MM-dd');
    const [selectedStatus, setSelectedStatus] = useState<work_status | 'all'>('all');
    const [filter, setFilter] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data: entries, isLoading } = useQuery({
        queryKey: ['hr', 'daily', formattedDate],
        queryFn: async () => {
            const res = await api.get<DailyEntry[]>(`/hr/entries/daily?date=${formattedDate}`);
            return res.data;
        },
    });

    const filteredEntries = entries?.filter(entry => {
        const matchesText = !filter ||
            `${entry.first_name} ${entry.last_name}`.toLowerCase().includes(filter.toLowerCase()) ||
            entry.email.toLowerCase().includes(filter.toLowerCase());

        const matchesStatus = selectedStatus === 'all' || entry.status === selectedStatus;
        return matchesText && matchesStatus;
    });

    // Group stats
    const stats = entries?.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {} as Record<work_status, number>);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Employee Summary</h1>
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
                    <Button variant="outline" size="icon" onClick={() => { setFilter(''); setSelectedStatus('all'); }}>
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
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
                            <div className="text-2xl font-bold">{stats?.[status] || 0}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Employee List */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Status List</CardTitle>
                    <div className="pt-2">
                        <Input
                            placeholder="Search employee..."
                            className="max-w-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : filteredEntries?.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No entries found for this date.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Country</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEntries?.slice((page - 1) * pageSize, page * pageSize).map(entry => (
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
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                    <div className="mt-4">
                        <TablePagination
                            currentPage={page}
                            totalPages={Math.ceil((filteredEntries?.length || 0) / pageSize)}
                            onPageChange={setPage}
                        />
                    </div>
                </CardContent>
            </Card >
        </div >
    );
}
