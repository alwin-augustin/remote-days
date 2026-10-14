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
import { StatusBadge } from '@/components/ui/status-badge';
import { REQUEST_STATUS_META, type RequestStatus } from '@/lib/status';
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
        const meta = REQUEST_STATUS_META[status as RequestStatus];
        if (!meta) return <StatusBadge tone="neutral">{status}</StatusBadge>;
        const Icon = status === 'pending' ? Clock : status === 'approved' ? Check : X;
        return <StatusBadge tone={meta.tone} icon={Icon}>{meta.label}</StatusBadge>;
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
                                                    className="text-success-muted-foreground hover:bg-success-muted"
                                                    onClick={() => openDecisionDialog(req, 'approved')}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-danger-muted-foreground hover:bg-danger-muted"
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
