import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getApiErrorMessage } from '@/lib/api';
import { format } from 'date-fns';
import { Trash2, Plus, Calendar, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';

// camelCase as returned by API
type ApiCountryThreshold = {
    countryCode: string;
    maxRemoteDays: number;
};

type ApiHoliday = {
    id: number;
    date: string;
    name: string;
    countryCode: string | null;
    createdAt: string;
};

export default function Holidays() {
    const queryClient = useQueryClient();
    const [newDate, setNewDate] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCountry, setNewCountry] = useState<string>('_GLOBAL_');
    const [filterCountry, setFilterCountry] = useState<string>('all');
    const [holidayToDelete, setHolidayToDelete] = useState<ApiHoliday | null>(null);

    // Fetch supported countries (thresholds) for the dropdowns
    const { data: countries } = useQuery({
        queryKey: ['admin', 'countries'],
        queryFn: async () => {
            const res = await api.get<{ data: ApiCountryThreshold[]; total: number }>('/admin/countries');
            return res.data.data;
        },
    });

    const { data: holidays, isLoading, isError } = useQuery({
        queryKey: ['admin', 'holidays', filterCountry],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (filterCountry && filterCountry !== 'all' && filterCountry !== '_GLOBAL_ONLY_') {
                params.country_code = filterCountry;
            }
            const res = await api.get<{ data: ApiHoliday[]; total: number }>('/admin/holidays', { params });
            return filterCountry === '_GLOBAL_ONLY_'
                ? res.data.data.filter((holiday) => !holiday.countryCode)
                : res.data.data;
        },
    });

    const addMutation = useMutation({
        mutationFn: async (data: { date: string; description: string; country_code?: string }) => {
            await api.post('/admin/holidays', data);
        },
        onSuccess: () => {
            toast.success('Holiday added');
            setNewDate('');
            setNewDesc('');
            setNewCountry('_GLOBAL_');
            queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] });
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to add holiday'));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/admin/holidays/${id}`);
        },
        onSuccess: () => {
            toast.success('Holiday deleted');
            queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] });
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete holiday'));
        },
    });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate || !newDesc) return;
        addMutation.mutate({
            date: newDate,
            description: newDesc,
            country_code: newCountry === '_GLOBAL_' ? undefined : newCountry,
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Holidays"
                description="Maintain the holiday calendars used to skip reminders and interpret compliance activity."
            />

            {isError ? <InlineErrorState description="Holiday data could not be loaded." /> : null}

            <SectionCard title="Add Holiday" description="Create a global holiday or scope it to a specific country." contentClassName="pt-6">
                <form onSubmit={handleAdd} className="flex flex-col gap-4 lg:flex-row lg:items-end">
                    <div className="grid gap-2">
                        <label htmlFor="date" className="text-sm font-medium">Date</label>
                        <Input
                            id="date"
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2 flex-1">
                        <label htmlFor="desc" className="text-sm font-medium">Description</label>
                        <Input
                            id="desc"
                            placeholder="e.g. New Year's Day"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2 w-full lg:w-48">
                        <label htmlFor="country" className="text-sm font-medium">Country (optional)</label>
                        <Select value={newCountry} onValueChange={setNewCountry}>
                            <SelectTrigger id="country">
                                <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_GLOBAL_">Global (All)</SelectItem>
                                {countries?.map((c) => (
                                    <SelectItem key={c.countryCode} value={c.countryCode}>
                                        {c.countryCode}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" disabled={addMutation.isPending}>
                        <Plus className="mr-2 h-4 w-4" /> Add
                    </Button>
                </form>
            </SectionCard>

            <SectionCard
                title="Existing Holidays"
                description="Filter the current set by country scope or inspect globally applied holidays."
                actions={
                    <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterCountry} onValueChange={setFilterCountry}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Country" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Countries</SelectItem>
                                <SelectItem value="_GLOBAL_ONLY_">Global Only</SelectItem>
                                {countries?.map((c) => (
                                    <SelectItem key={c.countryCode} value={c.countryCode}>
                                        {c.countryCode}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                }
                contentClassName="pt-6"
            >
                {isLoading ? (
                    <TableLoadingState rows={5} />
                ) : holidays?.length === 0 ? (
                    <TableEmptyState
                        title="No holidays found"
                        description="There are no holidays for the current filter."
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Country Scope</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays?.map((holiday) => (
                                <TableRow key={holiday.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {format(new Date(holiday.date), 'PPP')}
                                        </div>
                                    </TableCell>
                                    <TableCell>{holiday.name}</TableCell>
                                    <TableCell>
                                        {holiday.countryCode ? (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                                                {holiday.countryCode}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground">
                                                Global
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => setHolidayToDelete(holiday)}
                                            aria-label={`Delete holiday ${holiday.name}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </SectionCard>

            <ConfirmActionDialog
                open={!!holidayToDelete}
                onOpenChange={(open) => !open && setHolidayToDelete(null)}
                title="Delete holiday"
                description={
                    holidayToDelete
                        ? `Remove ${holidayToDelete.name} on ${format(new Date(holidayToDelete.date), 'PPP')}.`
                        : ''
                }
                confirmLabel="Delete holiday"
                variant="destructive"
                isLoading={deleteMutation.isPending}
                onConfirm={() => holidayToDelete && deleteMutation.mutate(holidayToDelete.id, {
                    onSuccess: () => setHolidayToDelete(null),
                })}
            />
        </div>
    );
}
