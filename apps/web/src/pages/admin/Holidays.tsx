import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Holiday, CountryThreshold } from '@remotedays/types';
import { format } from 'date-fns';
import { Trash2, Plus, Calendar, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner';

export default function Holidays() {
    const queryClient = useQueryClient();
    const [newDate, setNewDate] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCountry, setNewCountry] = useState<string>('_GLOBAL_'); // Default to Global
    const [filterCountry, setFilterCountry] = useState<string>('all');

    // Fetch supported countries (thresholds)
    const { data: countries } = useQuery({
        queryKey: ['countries'],
        queryFn: async () => {
            const res = await api.get<CountryThreshold[]>('/admin/countries');
            return res.data;
        },
    });

    const { data: holidays, isLoading } = useQuery({
        queryKey: ['holidays', filterCountry],
        queryFn: async () => {
            const params: { country_code?: string } = {};
            if (filterCountry && filterCountry !== 'all') {
                params.country_code = filterCountry;
            }
            const res = await api.get<Holiday[]>('/admin/holidays', { params });
            return res.data;
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
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        },
        onError: (err: unknown) => {
            const error = err as { response?: { data?: { message?: string } } };
            toast.error(error.response?.data?.message || 'Failed to add holiday');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await api.delete(`/admin/holidays/${id}`);
        },
        onSuccess: () => {
            toast.success('Holiday deleted');
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
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
            <h1 className="text-3xl font-bold tracking-tight">Holiday Management</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Holiday</CardTitle>
                    <CardDescription>Define holidays where daily prompts will be skipped.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="flex gap-4 items-end">
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
                        <div className="grid gap-2 w-48">
                            <label htmlFor="country" className="text-sm font-medium">Country (Opt)</label>
                            <Select value={newCountry} onValueChange={setNewCountry}>
                                <SelectTrigger id="country">
                                    <SelectValue placeholder="Select Country" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_GLOBAL_">Global (All)</SelectItem>
                                    {countries?.map((c) => (
                                        <SelectItem key={c.country_code} value={c.country_code}>
                                            {c.country_code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" disabled={addMutation.isPending}>
                            <Plus className="mr-2 h-4 w-4" /> Add
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xl font-bold">Existing Holidays</CardTitle>
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
                                    <SelectItem key={c.country_code} value={c.country_code}>
                                        {c.country_code}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="mt-4">
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
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4">Loading...</TableCell>
                                </TableRow>
                            ) : holidays?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No holidays found.</TableCell>
                                </TableRow>
                            ) : (
                                holidays?.map((holiday) => (
                                    <TableRow key={holiday.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                {format(new Date(holiday.date), 'PPP')}
                                            </div>
                                        </TableCell>
                                        <TableCell>{holiday.name}</TableCell>
                                        <TableCell>
                                            {holiday.country_code ? (
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                    {holiday.country_code}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                                                    Global
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700"
                                                onClick={() => deleteMutation.mutate(holiday.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
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
