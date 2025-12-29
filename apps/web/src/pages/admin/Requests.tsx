import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { EntryRequest } from '@remotedays/types';
import { format } from 'date-fns';
import { Check, X, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';

export default function Requests() {
    const queryClient = useQueryClient();

    // Fetch only pending requests for now, or all? 
    // Let's fetch all but sort by pending first in backend. 
    // Current backend 'getAllRequests' fetches all ordered by date DESC.
    const { data: requests, isLoading } = useQuery({
        queryKey: ['requests'],
        queryFn: async () => {
            const res = await api.get<EntryRequest[]>('/admin/requests');
            return res.data;
        },
    });

    const processMutation = useMutation({
        mutationFn: async ({ id, action, note }: { id: string; action: 'approve' | 'reject'; note?: string }) => {
            await api.post(`/admin/requests/${id}/process`, { action, note });
        },
        onSuccess: (_, variables) => {
            toast.success(`Request ${variables.action}d`);
            queryClient.invalidateQueries({ queryKey: ['requests'] });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Failed to process request');
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
            <h1 className="text-3xl font-bold tracking-tight">Data Correction Requests</h1>

            <Card>
                <CardHeader>
                    <CardTitle>User Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Requested Status</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                            ) : requests?.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No requests found.</TableCell></TableRow>
                            ) : (
                                requests?.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-medium">
                                            {typeof req.date === 'string' ? req.date.substring(0, 10) : format(new Date(req.date), 'yyyy-MM-dd')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{req.user_first_name} {req.user_last_name}</span>
                                                <span className="text-xs text-muted-foreground">{req.user_email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="capitalize">{req.requested_status}</TableCell>
                                        <TableCell className="max-w-xs truncate" title={req.reason}>{req.reason}</TableCell>
                                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                                        <TableCell className="text-right">
                                            {req.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => processMutation.mutate({ id: req.id, action: 'approve' })}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => processMutation.mutate({ id: req.id, action: 'reject' })}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
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
