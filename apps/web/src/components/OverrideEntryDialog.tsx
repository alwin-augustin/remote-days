import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api, getApiErrorMessage } from '@/lib/api';
import { toast } from 'sonner';
import type { work_status } from '@remotedays/types';

const TextareaFallback = ({ id, value, onChange, placeholder, className, required }: {
    id?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}) => (
    <textarea
        id={id}
        className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
    />
);

// camelCase as returned by the API
type DailyEntry = {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    status: work_status;
    countryOfResidence: string;
}

interface OverrideEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: DailyEntry | null;
    date: string; // yyyy-MM-dd
    onSuccess: () => void;
}

export function OverrideEntryDialog({ open, onOpenChange, entry, date, onSuccess }: OverrideEntryDialogProps) {
    const [status, setStatus] = useState<work_status>(entry?.status ?? 'unknown');
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen && entry) {
            setStatus(entry.status);
            setReason('');
        }
        onOpenChange(nextOpen);
    };

    const mutation = useMutation({
        mutationFn: async () => {
            if (!entry) return;
            // FE-013: PATCH /entries/{userId}/{date} with { status, reason } in body
            await api.patch(`/entries/${entry.userId}/${date}`, { status, reason });
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['employees'] });
            toast.success('Entry updated successfully');
            onSuccess();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to update entry'));
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            toast.error('Reason is required');
            return;
        }
        mutation.mutate();
    };

    if (!entry) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Override Entry</DialogTitle>
                    <DialogDescription>
                        Modify status for {entry.firstName} {entry.lastName} on {date}.
                        Reason is mandatory for audit purposes.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="status">New Status</Label>
                        <Select value={status} onValueChange={(val) => setStatus(val as work_status)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="office">Office</SelectItem>
                                <SelectItem value="travel">Travel</SelectItem>
                                <SelectItem value="sick">Sick</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason (Required)</Label>
                        <TextareaFallback
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Employee forgot to declare, Manager request..."
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Updating...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
