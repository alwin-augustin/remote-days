import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from '@/components/ui/date-range-picker'; // Need to create this or assume simple inputs

type AuditLog = {
    id: string;
    action: string;
    actor_id: string;
    target_id?: string;
    details: any;
    created_at: string;
    actor_email?: string;
    actor_first_name?: string;
    actor_last_name?: string;
    target_email?: string;
    target_first_name?: string;
    target_last_name?: string;
    reason?: string;
    entry_date?: string;
    previous_status?: string;
    new_status?: string;
};

import { TablePagination } from '@/components/TablePagination';

export default function AuditLogs() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin', 'audit', dateRange],
        queryFn: async () => {
            const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
            const res = await api.get<AuditLog[]>(`/admin/audit?startDate=${from}&endDate=${to}`);
            return res.data;
        },
        enabled: !!dateRange?.from,
    });

    const paginatedLogs = logs?.slice((page - 1) * pageSize, page * pageSize) || [];

    const handleDownloadExcel = async () => {
        if (!dateRange?.from) return;
        const from = format(dateRange.from, 'yyyy-MM-dd');
        const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

        try {
            const response = await api.get(`/admin/audit?startDate=${from}&endDate=${to}&format=excel`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-report-${from}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error("Failed to download excel", e);
        }
    };

    const formatUser = (first?: string, last?: string, email?: string) => {
        if (!email) return 'System';
        return `${first || ''} ${last || ''} (${email})`.trim();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <div className="flex items-center gap-2">
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                    <Button variant="outline" onClick={handleDownloadExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>System Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : !logs || logs.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No logs found for this period.</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Actor</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                                                {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{log.action}</span>
                                            </TableCell>
                                            <TableCell>
                                                {formatUser(log.actor_first_name, log.actor_last_name, log.actor_email)}
                                            </TableCell>
                                            <TableCell>
                                                {log.target_email && log.target_email !== 'N/A'
                                                    ? formatUser(log.target_first_name, log.target_last_name, log.target_email)
                                                    : '-'
                                                }
                                            </TableCell>
                                            <TableCell className="max-w-[200px] break-words">
                                                {log.reason || '-'}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={JSON.stringify(log.details, null, 2)}>
                                                {JSON.stringify(log.details)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="mt-4">
                                <TablePagination
                                    currentPage={page}
                                    totalPages={Math.ceil((logs.length || 0) / pageSize)}
                                    onPageChange={setPage}
                                />
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
