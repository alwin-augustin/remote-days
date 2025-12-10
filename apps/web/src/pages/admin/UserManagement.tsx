import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/api';
import type { User } from '@tracker/types';
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
import { Loader2, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

// Schema for Create/Update User
const userSchema = z.object({
    email: z.string().email(),
    first_name: z.string().min(2),
    last_name: z.string().min(2),
    country_of_residence: z.string().min(2),
    work_country: z.string().min(2),
    role: z.enum(['employee', 'hr', 'admin']),
    temp_password: z.string().min(6).optional(), // Optional for update
});

type UserFormValues = z.infer<typeof userSchema>;

import { TablePagination } from '@/components/TablePagination';

export default function UserManagement() {
    const [search, setSearch] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const queryClient = useQueryClient();

    // Fetch Users
    const { data, isLoading } = useQuery({
        queryKey: ['admin', 'users', search],
        queryFn: async () => {
            const res = await api.get<{ users: User[]; total: number }>(`/admin/users?search=${search}`);
            return res.data;
        },
    });

    const users = data?.users || [];
    const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error((error as any).response?.data?.message || "Failed to create user");
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }: { id: string; values: Partial<UserFormValues> }) => {
            // Remove temp_password if empty
            const payload = { ...values };
            if (!payload.temp_password) delete payload.temp_password;
            return api.put(`/admin/users/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
            setEditingUser(null);
            toast.success("User updated successfully");
        },
        onError: (error: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error((error as any).response?.data?.message || "Failed to update user");
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
        onError: () => toast.error("Failed to delete user"),
    });


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

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
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">No users found.</TableCell>
                            </TableRow>
                        ) : (
                            paginatedUsers.map((user) => (
                                <TableRow key={user.user_id}>
                                    <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="capitalize">{user.role}</TableCell>
                                    <TableCell>{user.country_of_residence} / {user.work_country}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => {
                                                if (confirm('Are you sure you want to delete this user?')) {
                                                    deleteMutation.mutate(user.user_id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <TablePagination
                currentPage={page}
                totalPages={Math.ceil(users.length / pageSize)}
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
                onSubmit={(values) => editingUser && updateMutation.mutate({ id: editingUser.user_id, values })}
                isLoading={updateMutation.isPending}
                initialValues={editingUser || undefined}
                mode="edit"
            />
        </div>
    );
}

// Sub-component for Dialog Form
function UserDialog({ open, onOpenChange, onSubmit, isLoading, initialValues, mode }: { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (values: UserFormValues) => void; isLoading: boolean; initialValues?: User; mode: 'create' | 'edit' }) {
    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            email: initialValues?.email || '',
            first_name: initialValues?.first_name || '',
            last_name: initialValues?.last_name || '',
            country_of_residence: initialValues?.country_of_residence || '',
            work_country: initialValues?.work_country || '',
            role: initialValues?.role || 'employee',
            temp_password: '',
        },
    });

    // Reset form when opening
    if (open && initialValues && form.getValues('email') !== initialValues.email) {
        form.reset({
            email: initialValues.email,
            first_name: initialValues.first_name,
            last_name: initialValues.last_name,
            country_of_residence: initialValues.country_of_residence,
            work_country: initialValues.work_country,
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
                            <FormField
                                control={form.control}
                                name="first_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>First Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="last_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Last Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input {...field} type="email" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="country_of_residence"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Residence</FormLabel>
                                        <FormControl><Input {...field} placeholder="Country Code (e.g. FR)" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="work_country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Work Country</FormLabel>
                                        <FormControl><Input {...field} placeholder="Country Code" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="employee">Employee</SelectItem>
                                            <SelectItem value="hr">HR</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="temp_password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{mode === 'create' ? 'Temporary Password' : 'New Password (Optional)'}</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
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
    );
}
