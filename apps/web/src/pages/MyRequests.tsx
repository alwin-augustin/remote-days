import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EntryRequest } from '@remotedays/types';
import { format } from 'date-fns';
import { Check, X, Clock } from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function MyRequests() {
    const { data: requests, isLoading } = useQuery({
        queryKey: ['my-requests'],
        queryFn: async () => {
            const res = await api.get<EntryRequest[]>('/requests/me');
            return res.data;
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
            case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Check className="w-3 h-3 mr-1" /> Approved</Badge>;
            case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><X className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">My Requests</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Request History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Requested Status</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Admin Note</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
                            ) : requests?.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No requests found.</TableCell></TableRow>
                            ) : (
                                requests?.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">
                                            {typeof req.date === 'string' ? req.date.substring(0, 10) : format(new Date(req.date), 'yyyy-MM-dd')}
                                        </TableCell>
                                        <TableCell className="capitalize">{req.requested_status}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={req.reason}>{req.reason}</TableCell>
                                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                                        <TableCell className="text-muted-foreground italic text-sm">{req.admin_note || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
