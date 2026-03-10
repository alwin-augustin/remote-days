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
    DialogDescription,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Pencil, Trash2, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { UserRole } from '@remotedays/types';

import { TablePagination } from '@/components/TablePagination';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';

// camelCase User as returned by the API (after onSend camelCase transform)
interface ApiUser {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    countryOfResidence: string;
    workCountry: string;
    isActive: boolean;
    createdAt: string;
}

// Schema for Create/Update User — body fields remain snake_case as the backend expects
const userSchema = z.object({
    email: z.string().email(),
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    country_of_residence: z.string().min(2),
    work_country: z.string().min(2),
    role: z.enum(['employee', 'hr', 'admin']),
    temp_password: z.string().min(6).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserManagement() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [roleFilter, setRoleFilter] = useState('all');
    const [countryFilter, setCountryFilter] = useState('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
    const [deletingUser, setDeletingUser] = useState<ApiUser | null>(null);
    const pageSize = 10;
    const queryClient = useQueryClient();

    // Fetch Users
    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin', 'users', search, page, roleFilter, countryFilter],
        queryFn: async () => {
            const offset = (page - 1) * pageSize;
            const params = new URLSearchParams({
                limit: pageSize.toString(),
                offset: offset.toString(),
            });
            if (search) params.append('search', search);
            if (roleFilter !== 'all') params.append('role', roleFilter);
            if (countryFilter !== 'all') params.append('country', countryFilter);

            const res = await api.get<{ data: ApiUser[]; total: number }>(`/admin/users?${params.toString()}`);
            return res.data;
        },
    });

    const users = data?.data || [];
    const totalUsers = data?.total || 0;
    const totalPages = Math.ceil(totalUsers / pageSize);

    const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
    const handleRoleChange = (val: string) => { setRoleFilter(val); setPage(1); };
    const handleCountryChange = (val: string) => { setCountryFilter(val); setPage(1); };

    // Mutations
    const createMutation = useMutation({
        mutationFn: async (values: UserFormValues) => {
            if (!values.temp_password) throw new Error("Password required");
            return api.post('/admin/users', values);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            setIsCreateOpen(false);
            toast.success("User created successfully");
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, "Failed to create user"));
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: string; values: Partial<UserFormValues> }) => {
            const payload = { ...values };
            if (!payload.temp_password) delete payload.temp_password;
            return api.patch(`/admin/users/${id}`, payload); // FE-010: PATCH not PUT
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            setEditingUser(null);
            toast.success("User updated successfully");
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, "Failed to update user"));
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/admin/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            toast.success("User deleted");
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, "Failed to delete user"));
        },
    });

    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Users"
                description="Manage account access, role assignments, and country context from a single responsive table."
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/admin/users/import')}>
                            <Upload className="mr-2 h-4 w-4" /> Import CSV
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </div>
                }
            />

            {isError ? <InlineErrorState description="User data could not be loaded." /> : null}

            <SectionCard title="Filters" description="Search by name or email, then narrow the dataset by role and country." contentClassName="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative max-w-sm flex-1 w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    <Select value={roleFilter} onValueChange={handleRoleChange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={countryFilter} onValueChange={handleCountryChange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="All Countries" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Countries</SelectItem>
                            <SelectItem value="FR">France</SelectItem>
                            <SelectItem value="BE">Belgium</SelectItem>
                            <SelectItem value="DE">Germany</SelectItem>
                            <SelectItem value="LU">Luxembourg</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </SectionCard>

            <SectionCard title="Directory" description={`${totalUsers} users match the current filters.`} contentClassName="pt-6">
                {isLoading ? (
                    <TableLoadingState rows={5} />
                ) : users.length === 0 ? (
                    <TableEmptyState title="No matching users" description="Try widening the role, country, or search filters." />
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Country</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {users.map((user) => (
                                <TableRow key={user.userId}>
                                    <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="capitalize">
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                            user.role === 'admin' ? "bg-primary/10 text-primary" :
                                                user.role === 'hr' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" :
                                                    "bg-muted text-muted-foreground"
                                        )}>
                                            {user.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>{user.countryOfResidence} / {user.workCountry}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeletingUser(user)}
                                            aria-label={`Delete ${user.firstName} ${user.lastName}`}
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

            <TablePagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            {/* Create User Dialog */}
            <UserDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSubmit={(values) => createMutation.mutate(values)}
                isLoading={createMutation.isPending}
                mode="create"
            />

            {/* Edit User Dialog */}
            <UserDialog
                open={!!editingUser}
                onOpenChange={(open) => !open && setEditingUser(null)}
                onSubmit={(values) => editingUser && updateMutation.mutate({ id: editingUser.userId, values })}
                isLoading={updateMutation.isPending}
                initialValues={editingUser || undefined}
                mode="edit"
            />

            <ConfirmActionDialog
                open={!!deletingUser}
                onOpenChange={(open) => !open && setDeletingUser(null)}
                title="Delete user"
                description={
                    deletingUser
                        ? `This will permanently remove ${deletingUser.firstName} ${deletingUser.lastName} from the system.`
                        : ''
                }
                confirmLabel="Delete user"
                variant="destructive"
                isLoading={deleteMutation.isPending}
                onConfirm={() => deletingUser && deleteMutation.mutate(deletingUser.userId, {
                    onSuccess: () => setDeletingUser(null),
                })}
            />
        </div>
    );
}

function UserDialog({
    open, onOpenChange, onSubmit, isLoading, initialValues, mode
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: UserFormValues) => void;
    isLoading: boolean;
    initialValues?: ApiUser;
    mode: 'create' | 'edit';
}) {
    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            email: initialValues?.email || '',
            first_name: initialValues?.firstName || '',
            last_name: initialValues?.lastName || '',
            country_of_residence: initialValues?.countryOfResidence || '',
            work_country: initialValues?.workCountry || '',
            role: initialValues?.role || 'employee',
            temp_password: '',
        },
    });

    // Reset form when opening with new values
    if (open && initialValues && form.getValues('email') !== initialValues.email) {
        form.reset({
            email: initialValues.email,
            first_name: initialValues.firstName,
            last_name: initialValues.lastName,
            country_of_residence: initialValues.countryOfResidence,
            work_country: initialValues.workCountry,
            role: initialValues.role,
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Create User' : 'Edit User'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create' ? 'Add a new user to the system.' : 'Update user details.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="first_name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>First Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="last_name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Last Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="email" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl><Input {...field} type="email" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="country_of_residence" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Residence</FormLabel>
                                    <FormControl><Input {...field} placeholder="Country Code (e.g. FR)" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="work_country" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Work Country</FormLabel>
                                    <FormControl><Input {...field} placeholder="Country Code" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="role" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="employee">Employee</SelectItem>
                                        <SelectItem value="hr">HR</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="temp_password" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{mode === 'create' ? 'Temporary Password' : 'New Password (Optional)'}</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
