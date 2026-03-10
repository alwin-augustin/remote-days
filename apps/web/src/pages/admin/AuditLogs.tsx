import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TablePagination } from '@/components/TablePagination';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';

// camelCase as returned by API
type AuditLog = {
    id: string;
    action: string;
    actorId: string;
    targetId?: string;
    details: Record<string, unknown>;
    createdAt: string;
    actorEmail?: string;
    actorFirstName?: string;
    actorLastName?: string;
    targetEmail?: string;
    targetFirstName?: string;
    targetLastName?: string;
    reason?: string;
    entryDate?: string;
    previousStatus?: string;
    newStatus?: string;
};

export default function AuditLogs() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data: logs, isLoading, isError } = useQuery({
        queryKey: ['admin', 'audit', dateRange],
        queryFn: async () => {
            const from = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
            const to = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';
            const res = await api.get<{ data: AuditLog[]; total: number }>(`/admin/audit?startDate=${from}&endDate=${to}`);
            return res.data.data;
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
            logger.error("Failed to download audit excel", e);
        }
    };

    const formatUser = (first?: string, last?: string, email?: string) => {
        if (!email) return 'System';
        return `${first || ''} ${last || ''} (${email})`.trim();
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Audit Logs"
                description="Review system activity across the selected date range and export reports when needed."
                actions={
                    <div className="flex items-center gap-2">
                    <DateRangePicker date={dateRange} setDate={setDateRange} />
                    <Button variant="outline" onClick={handleDownloadExcel}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                    </div>
                }
            />

            {isError ? <InlineErrorState description="Audit log data could not be loaded." /> : null}

            <SectionCard title="System Activity" description="Inspect recent actions taken across the platform." contentClassName="pt-6">
                    {isLoading ? (
                        <TableLoadingState rows={6} />
                    ) : !logs || logs.length === 0 ? (
                        <TableEmptyState title="No audit entries" description="No activity was recorded for the selected time window." />
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
                                                {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{log.action}</span>
                                            </TableCell>
                                            <TableCell>
                                                {formatUser(log.actorFirstName, log.actorLastName, log.actorEmail)}
                                            </TableCell>
                                            <TableCell>
                                                {log.targetEmail && log.targetEmail !== 'N/A'
                                                    ? formatUser(log.targetFirstName, log.targetLastName, log.targetEmail)
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
            </SectionCard>
        </div>
    );
}
