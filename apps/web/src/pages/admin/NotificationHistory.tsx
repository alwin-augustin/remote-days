import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

type NotificationStats = {
    total_active_users_notified: number;
    total_sent_prompts: number;
    users_without_entry: number;
    date: string;
};

type JobStatus = {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    sent: number;
    skipped: number;
    error?: string;
};

export default function NotificationHistory() {
    const [date, setDate] = useState<Date>(new Date());
    const [jobId, setJobId] = useState<string | null>(null);
    const formattedDate = format(date, 'yyyy-MM-dd');
    const queryClient = useQueryClient();
    const processedJobRef = useRef<string | null>(null);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin', 'notifications', formattedDate],
        queryFn: async () => {
            const res = await api.get<NotificationStats>(`/admin/notifications/stats?date=${formattedDate}`);
            return res.data;
        },
    });

    // Poll for job status
    const { data: jobStatus } = useQuery({
        queryKey: ['admin', 'email-job', jobId],
        queryFn: async () => {
            if (!jobId) return null;
            const res = await api.get<JobStatus>(`/admin/email-jobs/${jobId}`);
            return res.data;
        },
        enabled: !!jobId,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status === 'completed' || status === 'failed' ? false : 1000;
        },
    });

    useEffect(() => {
        if (!jobStatus || !jobId) return;

        // Avoid processing the same job completion twice
        if (processedJobRef.current === jobId) return;

        if (jobStatus.status === 'completed') {
            processedJobRef.current = jobId;
            toast.success(`Broadcasting completed: Sent ${jobStatus.sent}, Skipped ${jobStatus.skipped}`);
            queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
            // Clear job ID after delay using setTimeout to avoid sync setState in effect
            const timeoutId = setTimeout(() => setJobId(null), 3000);
            return () => clearTimeout(timeoutId);
        } else if (jobStatus.status === 'failed') {
            processedJobRef.current = jobId;
            toast.error(`Broadcasting failed: ${jobStatus.error}`);
            // Clear job ID after a brief delay
            const timeoutId = setTimeout(() => setJobId(null), 100);
            return () => clearTimeout(timeoutId);
        }
    }, [jobStatus, queryClient, jobId]);

    const resendMutation = useMutation({
        mutationFn: async () => {
            return api.post<{ jobId: string, message: string }>('/admin/trigger-daily-emails', { onlyPending: true });
        },
        onSuccess: (res) => {
            processedJobRef.current = null; // Reset ref for new job
            setJobId(res.data.jobId);
            toast.success(res.data.message);
        },
        onError: () => toast.error("Failed to trigger notifications"),
    });

    const isProcessing = jobId !== null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Notification History</h1>
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
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Prompts</CardTitle>
                        <CardDescription>Status for {formattedDate}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : stats ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Total Users</span>
                                    <span className="text-xl font-bold">{stats.total_active_users_notified || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Sent</span>
                                    <span className="text-xl font-bold text-green-600">{stats.total_sent_prompts || '-'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">No stats available.</div>
                        )}

                        {jobId && jobStatus && (
                            <div className="space-y-2 pt-2">
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Sending... {Math.round(jobStatus.progress)}%</span>
                                    <span>{jobStatus.sent} / {jobStatus.total}</span>
                                </div>
                                <Progress value={jobStatus.progress} className="h-2" />
                            </div>
                        )}

                        <Button
                            className="w-full"
                            variant="default"
                            onClick={() => {
                                if (confirm('Are you sure you want to resend daily prompts to users who haven\'t responded?')) {
                                    resendMutation.mutate();
                                }
                            }}
                            disabled={resendMutation.isPending || isProcessing || !date || formattedDate !== new Date().toISOString().split('T')[0]}
                            title={formattedDate !== new Date().toISOString().split('T')[0] ? "Can only resend for current date" : "Resend daily prompt"}
                        >
                            {resendMutation.isPending || isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            {isProcessing ? 'Sending...' : 'Resend Prompts'}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Sent Notifications Log</CardTitle>
                    <CardDescription>Log of notifications sent on {formattedDate}</CardDescription>
                </CardHeader>
                <CardContent>
                    <NotificationLogsTable date={formattedDate} />
                </CardContent>
            </Card>
        </div>
    );
}

function NotificationLogsTable({ date }: { date: string }) {
    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin', 'notifications', 'logs', date],
        queryFn: async () => {
            const res = await api.get<{ id: string, sent_at: string, user_first_name: string, user_last_name: string, user_email: string, notification_type: string }[]>(`/admin/notifications/logs?date=${date}`);
            return res.data;
        },
    });

    if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

    if (!logs || logs.length === 0) {
        return <div className="text-center py-4 text-muted-foreground">No notifications sent on this date.</div>;
    }

    return (
        <div className="rounded-md border">
            <table className="w-full caption-bottom text-sm text-left">
                <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Time</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">User</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Email</th>
                        <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Type</th>
                    </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                    {logs.map((log) => (
                        <tr key={log.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <td className="p-4 align-middle">{format(new Date(log.sent_at), 'HH:mm:ss')}</td>
                            <td className="p-4 align-middle">{log.user_first_name} {log.user_last_name}</td>
                            <td className="p-4 align-middle">{log.user_email}</td>
                            <td className="p-4 align-middle capitalize">{log.notification_type.replace('_', ' ')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
