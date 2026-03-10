import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Check, X, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { RequestChangeDialog } from '@/components/RequestChangeDialog';
import { SectionCard } from '@/components/SectionCard';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';

type RequestItem = {
    id: string;
    date: string;
    requestedStatus: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    adminNote?: string;
};

export default function MyRequests() {
    const { data: requests, isLoading, isError } = useQuery({
        queryKey: ['requests', 'mine'],
        queryFn: async () => {
            const res = await api.get<{ data: RequestItem[]; total: number }>('/requests');
            return res.data.data;
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
            <PageHeader
                title="Requests"
                description="Track the status of your correction requests and submit a new one when needed."
                actions={<RequestChangeDialog />}
            />

            <SectionCard
                title="Request History"
                description="Each request includes the requested status, your explanation, and any HR note."
                contentClassName="pt-6"
            >
                {isError ? (
                    <InlineErrorState description="We couldn't load your requests right now." />
                ) : isLoading ? (
                    <TableLoadingState rows={4} />
                ) : requests?.length === 0 ? (
                    <TableEmptyState
                        title="No requests yet"
                        description="You have not submitted any work-status correction requests."
                    />
                ) : (
                    <>
                        <div className="hidden md:block">
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
                                    {requests?.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">
                                                {typeof req.date === 'string' ? req.date.substring(0, 10) : format(new Date(req.date), 'yyyy-MM-dd')}
                                            </TableCell>
                                            <TableCell className="capitalize">{req.requestedStatus}</TableCell>
                                            <TableCell className="max-w-xs whitespace-normal break-words">{req.reason}</TableCell>
                                            <TableCell>{getStatusBadge(req.status)}</TableCell>
                                            <TableCell className="max-w-xs whitespace-normal break-words text-sm text-muted-foreground">
                                                {req.adminNote || 'No HR note'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="grid gap-4 md:hidden">
                            {requests?.map((req) => (
                                <Card key={req.id} className="border-border/70 shadow-sm">
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {typeof req.date === 'string' ? req.date.substring(0, 10) : format(new Date(req.date), 'yyyy-MM-dd')}
                                                </p>
                                                <p className="text-sm text-muted-foreground capitalize">
                                                    Requested: {req.requestedStatus}
                                                </p>
                                            </div>
                                            {getStatusBadge(req.status)}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</p>
                                            <p className="text-sm">{req.reason}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">HR Note</p>
                                            <p className="text-sm text-muted-foreground">{req.adminNote || 'No HR note'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </SectionCard>
        </div>
    );
}
