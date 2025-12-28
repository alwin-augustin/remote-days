import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { work_status } from '@remotedays/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Home, Building, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StatusCardProps {
    currentStatus?: work_status;
    selectedDate?: Date;
}

// Employee self-declaration options - only home and office
// Travel, sick, and unknown can only be set by HR/Admin via override
const STATUS_CONFIG: Record<'home' | 'office', { label: string; icon: LucideIcon; color: string }> = {
    home: { label: 'Home Office', icon: Home, color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
    office: { label: 'Office', icon: Building, color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
};

const EMPLOYEE_STATUSES: ('home' | 'office')[] = ['home', 'office'];

export default function StatusCard({ currentStatus, selectedDate = new Date() }: StatusCardProps) {
    const queryClient = useQueryClient();
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const isToday = format(new Date(), 'yyyy-MM-dd') === formattedDate;

    const mutation = useMutation({
        mutationFn: async (status: work_status) => {
            const res = await api.post('/entries', { status, date: formattedDate });
            return res.data;
        },
        onSuccess: async () => {
            // Force immediate refetch to update compliance stats
            await Promise.all([
                queryClient.refetchQueries({ queryKey: ['entries'] }),
                queryClient.refetchQueries({ queryKey: ['stats'] }),
            ]);
            toast.success("Status updated!");
        },
        onError: (error: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const message = (error as any).response?.data?.message || "Failed to update status";
            toast.error(message);
        },
    });

    const handleStatusChange = (status: work_status) => {
        mutation.mutate(status);
    };

    const isSelectionLocked = !!currentStatus && currentStatus !== 'unknown' && isToday;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Work Status for {isToday ? "Today" : format(selectedDate, 'EEEE, MMM d')}</CardTitle>
                <CardDescription>
                    {isSelectionLocked
                        ? "Status is locked for today. Submit a request to change it."
                        : "Where are you working from?"}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                {EMPLOYEE_STATUSES.map((status) => {
                    const config = STATUS_CONFIG[status];
                    const Icon = config.icon;
                    const isActive = currentStatus === status;
                    return (
                        <Button
                            key={status}
                            variant="outline"
                            className={cn(
                                "h-24 flex-col gap-2 border-2 transition-all duration-200 active:scale-95",
                                isActive
                                    ? cn(config.color, "border-current ring-2 ring-offset-2 ring-primary/20 shadow-sm opacity-100")
                                    : "hover:border-primary/50 hover:bg-muted/50",
                                mutation.isPending && "opacity-50 cursor-not-allowed",
                                isSelectionLocked && !isActive && "opacity-50 cursor-not-allowed" // Dim non-selected items when locked
                            )}
                            onClick={() => handleStatusChange(status)}
                            disabled={mutation.isPending || isSelectionLocked}
                        >
                            {mutation.isPending && isActive ? <Loader2 className="h-6 w-6 animate-spin" /> : <Icon className="h-6 w-6" />}
                            <span className="font-medium">{config.label}</span>
                        </Button>
                    );
                })}
            </CardContent>
        </Card>
    );
}
