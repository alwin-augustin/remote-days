import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { work_status } from '@tracker/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Home, Building, Plane, Stethoscope, HelpCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StatusCardProps {
    currentStatus?: work_status;
    selectedDate?: Date;
}

const STATUS_CONFIG: Record<work_status, { label: string; icon: LucideIcon; color: string }> = {
    home: { label: 'Home Office', icon: Home, color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
    office: { label: 'Office', icon: Building, color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
    travel: { label: 'Business Travel', icon: Plane, color: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200' },
    sick: { label: 'Sick Leave', icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
    unknown: { label: 'Not Set', icon: HelpCircle, color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

export default function StatusCard({ currentStatus, selectedDate = new Date() }: StatusCardProps) {
    const queryClient = useQueryClient();
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const isToday = format(new Date(), 'yyyy-MM-dd') === formattedDate;

    const mutation = useMutation({
        mutationFn: async (status: work_status) => {
            const res = await api.post('/entries', { status, date: formattedDate });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entries'] });
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            toast.success("Status updated!");
            // Note: need to install sonner or use hook for toast
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
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {(['home', 'office', 'travel', 'sick'] as work_status[]).map((status) => {
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
