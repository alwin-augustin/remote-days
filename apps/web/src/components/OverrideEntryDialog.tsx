import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { work_status } from '@remotedays/types';

// Fallback if Textarea component doesn't exist (I didn't find it in search)
// I will assume I can use a simple textarea with tailwind classes
interface TextareaFallbackProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
    id?: string;
}

const TextareaFallback = ({ value, onChange, placeholder, className, required }: TextareaFallbackProps) => (
    <textarea
        className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
    />
);

type DailyEntry = {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: work_status;
    country_of_residence: string;
}

interface OverrideEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entry: DailyEntry | null;
    date: string; // yyyy-mm-dd
    onSuccess: () => void;
}

export function OverrideEntryDialog({ open, onOpenChange, entry, date, onSuccess }: OverrideEntryDialogProps) {
    const [status, setStatus] = useState<work_status>('unknown');
    const [reason, setReason] = useState('');
    const queryClient = useQueryClient();

    // Initialize state when dialog opens with new entry
    // Using refs pattern or accepting the lint rule is common for dialog initialization
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (entry && open) {
            setStatus(entry.status);
            setReason('');
        }
    }, [entry, open]);
    /* eslint-enable react-hooks/set-state-in-effect */

    const mutation = useMutation({
        mutationFn: async () => {
            if (!entry) return;
            await api.post('/entries/override', {
                targetUserId: entry.user_id,
                date,
                status,
                reason
            });
        },
        onSuccess: async () => {
            // Force immediate refetch to update data
            await queryClient.refetchQueries({ queryKey: ['hr'] });
            toast.success('Entry updated successfully');
            onSuccess();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error((error as any).response?.data?.message || 'Failed to update entry');
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Override Entry</DialogTitle>
                    <DialogDescription>
                        Modify status for {entry.first_name} {entry.last_name} on {date}.
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
