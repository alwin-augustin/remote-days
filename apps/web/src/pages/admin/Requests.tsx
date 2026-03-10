import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { format } from 'date-fns';
import { Check, X, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type RequestItem = {
    id: string;
    date: string;
    requestedStatus: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    userFirstName?: string;
    userLastName?: string;
    userEmail?: string;
};

export default function Requests() {
    const queryClient = useQueryClient();
    const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
    const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
    const [adminNote, setAdminNote] = useState('');

    const { data: requests, isLoading, isError } = useQuery({
        queryKey: ['requests', 'all'],
        queryFn: async () => {
            const res = await api.get<{ data: RequestItem[]; total: number }>('/requests');
            return res.data.data;
        },
    });

    const processMutation = useMutation({
        mutationFn: async ({ id, status, note }: { id: string; status: 'approved' | 'rejected'; note?: string }) => {
            await api.patch(`/requests/${id}`, { status, adminNote: note });
        },
        onSuccess: (_, variables) => {
            toast.success(`Request ${variables.status}`);
            queryClient.invalidateQueries({ queryKey: ['requests'] });
            setSelectedRequest(null);
            setAdminNote('');
        },
        onError: (err: unknown) => {
            toast.error(getApiErrorMessage(err, 'Failed to process request'));
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

    const pendingRequests = useMemo(
        () => (requests || []).filter((request) => request.status === 'pending'),
        [requests]
    );

    const openDecisionDialog = (request: RequestItem, nextDecision: 'approved' | 'rejected') => {
        setSelectedRequest(request);
        setDecision(nextDecision);
        setAdminNote('');
    };

    const handleProcessRequest = () => {
        if (!selectedRequest) return;
        if (decision === 'rejected' && !adminNote.trim()) {
            toast.error('A note is required when rejecting a request.');
            return;
        }

        processMutation.mutate({
            id: selectedRequest.id,
            status: decision,
            note: adminNote.trim() || undefined,
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Requests"
                description="Review pending correction requests with enough context to approve confidently or reject with a clear note."
            />

            <SectionCard
                title="Pending Queue"
                description={`${pendingRequests.length} request${pendingRequests.length === 1 ? '' : 's'} currently need a decision.`}
                contentClassName="pt-6"
            >
                {isError ? (
                    <InlineErrorState description="We couldn't load the request queue right now." />
                ) : isLoading ? (
                    <TableLoadingState rows={5} />
                ) : requests?.length === 0 ? (
                    <TableEmptyState
                        title="No requests found"
                        description="There are no employee correction requests to review right now."
                    />
                ) : (
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
                            {requests?.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">
                                        {typeof req.date === 'string' ? req.date.substring(0, 10) : format(new Date(req.date), 'yyyy-MM-dd')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{req.userFirstName} {req.userLastName}</span>
                                            <span className="text-xs text-muted-foreground">{req.userEmail}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize">{req.requestedStatus}</TableCell>
                                    <TableCell className="max-w-sm whitespace-normal break-words">{req.reason}</TableCell>
                                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                                    <TableCell className="text-right">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => openDecisionDialog(req, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => openDecisionDialog(req, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Decision recorded</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </SectionCard>

            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {decision === 'approved' ? 'Approve request' : 'Reject request'}
                        </DialogTitle>
                        <DialogDescription>
                            Review the request details below before you confirm the decision.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRequest ? (
                        <div className="space-y-4">
                            <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                                <p><span className="font-medium">Employee:</span> {selectedRequest.userFirstName} {selectedRequest.userLastName}</p>
                                <p><span className="font-medium">Email:</span> {selectedRequest.userEmail}</p>
                                <p><span className="font-medium">Date:</span> {selectedRequest.date.substring(0, 10)}</p>
                                <p><span className="font-medium">Requested status:</span> <span className="capitalize">{selectedRequest.requestedStatus}</span></p>
                                <p className="mt-3"><span className="font-medium">Reason:</span></p>
                                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedRequest.reason}</p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="admin-note">
                                    {decision === 'approved' ? 'Decision note (optional)' : 'Decision note (required)'}
                                </Label>
                                <Textarea
                                    id="admin-note"
                                    value={adminNote}
                                    onChange={(event) => setAdminNote(event.target.value)}
                                    placeholder={
                                        decision === 'approved'
                                            ? 'Add optional context for the employee.'
                                            : 'Explain why the request is being rejected.'
                                    }
                                />
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={processMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant={decision === 'approved' ? 'default' : 'destructive'}
                            onClick={handleProcessRequest}
                            disabled={processMutation.isPending}
                        >
                            {decision === 'approved' ? 'Confirm approval' : 'Confirm rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
