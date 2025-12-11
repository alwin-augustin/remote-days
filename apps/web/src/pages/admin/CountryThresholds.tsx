import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import type { CountryThreshold } from '@tracker/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const countrySchema = z.object({
    country_code: z.string().min(2).max(2).toUpperCase(),
    max_remote_days: z.coerce.number().min(0),
});

type CountryFormValues = z.infer<typeof countrySchema>;

export default function CountryThresholds() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState<CountryThreshold | null>(null);
    const queryClient = useQueryClient();

    const { data: countries, isLoading } = useQuery({
        queryKey: ['admin', 'countries'],
        queryFn: async () => {
            const res = await api.get<CountryThreshold[]>('/admin/countries');
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (values: CountryFormValues) => {
            return api.post('/admin/countries', values);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'countries'] });
            setIsCreateOpen(false);
            toast.success("Country threshold created");
        },
        onError: () => toast.error("Failed to create threshold"),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ code, values }: { code: string; values: CountryFormValues }) => {
            return api.put(`/admin/countries/${code}`, values);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'countries'] });
            setEditingCountry(null);
            toast.success("Country threshold updated");
        },
        onError: () => toast.error("Failed to update threshold"),
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Country Thresholds</h1>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Country
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Country Code</TableHead>
                            <TableHead>Max Remote Days / Month</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : countries?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">No thresholds defined.</TableCell>
                            </TableRow>
                        ) : (
                            countries?.map((country) => (
                                <TableRow key={country.country_code}>
                                    <TableCell className="font-medium">{country.country_code}</TableCell>
                                    <TableCell>{country.max_remote_days}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingCountry(country)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CountryDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={(values) => createMutation.mutate(values)}
                isLoading={createMutation.isPending}
                mode="create"
            />

            <CountryDialog
                open={!!editingCountry}
                onOpenChange={(open) => !open && setEditingCountry(null)}
                onSubmit={(values) => editingCountry && updateMutation.mutate({ code: editingCountry.country_code, values })}
                isLoading={updateMutation.isPending}
                initialValues={editingCountry || undefined}
                mode="edit"
            />
        </div>
    );
}

function CountryDialog({ open, onOpenChange, onSubmit, isLoading, initialValues, mode }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: CountryFormValues) => void; isLoading: boolean; initialValues?: CountryThreshold; mode: 'create' | 'edit' }) {
    const form = useForm<CountryFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(countrySchema) as any, // Cast to any to bypass strict type check for now due to coercion issues
        defaultValues: {
            country_code: initialValues?.country_code || '',
            max_remote_days: initialValues?.max_remote_days || 0,
        },
    });

    if (open && initialValues && form.getValues('country_code') !== initialValues.country_code) {
        form.reset({
            country_code: initialValues.country_code,
            max_remote_days: initialValues.max_remote_days,
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Add Country Threshold' : 'Edit Threshold'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="country_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country Code (ISO 2)</FormLabel>
                                    <FormControl><Input {...field} maxLength={2} disabled={mode === 'edit'} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="max_remote_days"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Max Remote Days per Month</FormLabel>
                                    <FormControl><Input {...field} type="number" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {mode === 'create' ? 'Create' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
