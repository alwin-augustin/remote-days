import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, getApiErrorMessage } from '@/lib/api';
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
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';

// camelCase as returned by API
type ApiCountryThreshold = {
    countryCode: string;
    maxRemoteDays: number;
    createdAt?: string;
    updatedAt?: string;
};

const countrySchema = z.object({
    country_code: z.string().min(2).max(2).toUpperCase(),
    max_remote_days: z.coerce.number().min(0),
});

type CountryFormValues = z.infer<typeof countrySchema>;

export default function CountryThresholds() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingCountry, setEditingCountry] = useState<ApiCountryThreshold | null>(null);
    const [deletingCountry, setDeletingCountry] = useState<ApiCountryThreshold | null>(null);
    const queryClient = useQueryClient();

    const { data: countries, isLoading, isError } = useQuery({
        queryKey: ['admin', 'countries'],
        queryFn: async () => {
            const res = await api.get<{ data: ApiCountryThreshold[]; total: number }>('/admin/countries');
            return res.data.data;
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
        onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to create threshold")),
    });

    const deleteMutation = useMutation({
        mutationFn: async (code: string) => {
            return api.delete(`/admin/countries/${code}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'countries'] });
            toast.success("Country threshold deleted");
        },
        onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to delete threshold")),
    });

    const updateMutation = useMutation({
        mutationFn: async ({ code, values }: { code: string; values: CountryFormValues }) => {
            return api.patch(`/admin/countries/${code}`, values); // FE-012: PATCH not PUT
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'countries'] });
            setEditingCountry(null);
            toast.success("Country threshold updated");
        },
        onError: (error: unknown) => toast.error(getApiErrorMessage(error, "Failed to update threshold")),
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Country Limits"
                description="Maintain the annual remote work allowances that drive compliance warnings."
                actions={
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Country
                    </Button>
                }
            />

            {isError ? <InlineErrorState description="Country threshold data could not be loaded." /> : null}

            <SectionCard title="Thresholds" description="These values control employee compliance calculations." contentClassName="pt-6">
                {isLoading ? (
                    <TableLoadingState rows={4} />
                ) : countries?.length === 0 ? (
                    <TableEmptyState title="No thresholds defined" description="Add a country threshold to begin tracking compliance against it." />
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Country Code</TableHead>
                                    <TableHead>Max Remote Days</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {countries?.map((country) => (
                                    <TableRow key={country.countryCode}>
                                        <TableCell className="font-medium">{country.countryCode}</TableCell>
                                        <TableCell>{country.maxRemoteDays}</TableCell>
                                        <TableCell className="text-right flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingCountry(country)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => setDeletingCountry(country)}
                                                disabled={deleteMutation.isPending}
                                                aria-label={`Delete threshold for ${country.countryCode}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </SectionCard>

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
                onSubmit={(values) => editingCountry && updateMutation.mutate({ code: editingCountry.countryCode, values })}
                isLoading={updateMutation.isPending}
                initialValues={editingCountry || undefined}
                mode="edit"
            />

            <ConfirmActionDialog
                open={!!deletingCountry}
                onOpenChange={(open) => !open && setDeletingCountry(null)}
                title="Delete country threshold"
                description={
                    deletingCountry
                        ? `Remove the ${deletingCountry.countryCode} threshold from compliance calculations.`
                        : ''
                }
                confirmLabel="Delete threshold"
                variant="destructive"
                isLoading={deleteMutation.isPending}
                onConfirm={() => deletingCountry && deleteMutation.mutate(deletingCountry.countryCode, {
                    onSuccess: () => setDeletingCountry(null),
                })}
            />
        </div>
    );
}

function CountryDialog({
    open, onOpenChange, onSubmit, isLoading, initialValues, mode
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: CountryFormValues) => void;
    isLoading: boolean;
    initialValues?: ApiCountryThreshold;
    mode: 'create' | 'edit';
}) {
    const form = useForm<CountryFormValues>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(countrySchema) as any,
        defaultValues: {
            country_code: initialValues?.countryCode || '',
            max_remote_days: initialValues?.maxRemoteDays || 0,
        },
    });

    if (open && initialValues && form.getValues('country_code') !== initialValues.countryCode) {
        form.reset({
            country_code: initialValues.countryCode,
            max_remote_days: initialValues.maxRemoteDays,
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
                        <FormField control={form.control} name="country_code" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country Code (ISO 2)</FormLabel>
                                <FormControl><Input {...field} maxLength={2} disabled={mode === 'edit'} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="max_remote_days" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Remote Days per Year</FormLabel>
                                <FormControl><Input {...field} type="number" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
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
    );
}
