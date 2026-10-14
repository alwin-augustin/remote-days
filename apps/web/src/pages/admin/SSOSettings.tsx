import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { AlertCircle, CheckCircle2, Loader2, PlugZap, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { InlineErrorState, TableEmptyState, TableLoadingState } from '@/components/DataStates';
import type {
    SsoConnectionTestResult,
    SsoLinkedIdentity,
    SsoSettings,
} from '@remotedays/types';

/**
 * Admin configuration for enterprise single sign-on (OIDC).
 *
 * Accounts are never created here — employees are provisioned by HR and the
 * identity provider only authenticates them. Tenant pinning and the email-domain
 * allowlist are the two controls that keep that safe, so both are surfaced
 * prominently rather than buried.
 */

const ssoSchema = z.object({
    displayName: z.string().min(1, 'Required').max(60),
    issuer: z.string().url('Must be a full URL, e.g. https://login.microsoftonline.com/<tenant>/v2.0').max(500),
    tenantId: z.string().max(100).optional(),
    clientId: z.string().min(1, 'Required').max(255),
    // Blank means "keep the stored secret".
    clientSecret: z.string().max(1000).optional(),
    scopes: z.string().max(300).optional(),
    allowedEmailDomains: z.string().max(500).optional(),
    autoLinkByEmail: z.boolean(),
    isEnabled: z.boolean(),
});

type SsoFormValues = z.infer<typeof ssoSchema>;

function splitDomains(value: string | undefined): string[] {
    return (value ?? '')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
}

export default function SSOSettings() {
    const queryClient = useQueryClient();
    const [testResult, setTestResult] = useState<SsoConnectionTestResult | null>(null);
    const [unlinking, setUnlinking] = useState<SsoLinkedIdentity | null>(null);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin', 'sso'],
        queryFn: async () => {
            const res = await api.get<{ settings: SsoSettings | null }>('/admin/sso');
            return res.data.settings;
        },
    });

    const { data: identities, isLoading: isLoadingIdentities } = useQuery({
        queryKey: ['admin', 'sso', 'identities'],
        queryFn: async () => {
            const res = await api.get<{ identities: SsoLinkedIdentity[] }>('/admin/sso/identities');
            return res.data.identities;
        },
    });

    const form = useForm<SsoFormValues>({
        resolver: zodResolver(ssoSchema),
        defaultValues: {
            displayName: 'Microsoft',
            issuer: '',
            tenantId: '',
            clientId: '',
            clientSecret: '',
            scopes: 'openid profile email',
            allowedEmailDomains: '',
            autoLinkByEmail: true,
            isEnabled: false,
        },
    });

    const { reset } = form;

    // Populate the form once the stored configuration arrives.
    useEffect(() => {
        if (!isLoading) {
            reset({
                displayName: data?.displayName ?? 'Microsoft',
                issuer: data?.issuer ?? '',
                tenantId: data?.tenantId ?? '',
                clientId: data?.clientId ?? '',
                clientSecret: '',
                scopes: data?.scopes ?? 'openid profile email',
                allowedEmailDomains: (data?.allowedEmailDomains ?? []).join(', '),
                autoLinkByEmail: data?.autoLinkByEmail ?? true,
                isEnabled: data?.isEnabled ?? false,
            });
        }
    }, [data, isLoading, reset]);

    const saveMutation = useMutation({
        mutationFn: async (values: SsoFormValues) => {
            // Omit clientSecret entirely when blank so the stored secret is kept;
            // the API treats "absent" and "null" differently on purpose.
            const body: Record<string, unknown> = {
                displayName: values.displayName,
                issuer: values.issuer.replace(/\/$/, ''),
                tenantId: values.tenantId?.trim() ? values.tenantId.trim() : null,
                clientId: values.clientId,
                scopes: values.scopes?.trim() || 'openid profile email',
                allowedEmailDomains: splitDomains(values.allowedEmailDomains),
                autoLinkByEmail: values.autoLinkByEmail,
                isEnabled: values.isEnabled,
            };
            if (values.clientSecret?.trim()) {
                body.clientSecret = values.clientSecret.trim();
            }
            const res = await api.put<{ settings: SsoSettings }>('/admin/sso', body);
            return res.data.settings;
        },
        onSuccess: (settings) => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'sso'] });
            queryClient.invalidateQueries({ queryKey: ['sso', 'status'] });
            reset({
                displayName: settings.displayName,
                issuer: settings.issuer,
                tenantId: settings.tenantId ?? '',
                clientId: settings.clientId,
                clientSecret: '',
                scopes: settings.scopes,
                allowedEmailDomains: settings.allowedEmailDomains.join(', '),
                autoLinkByEmail: settings.autoLinkByEmail,
                isEnabled: settings.isEnabled,
            });
            toast.success('SSO settings saved');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Could not save SSO settings'));
        },
    });

    const testMutation = useMutation({
        mutationFn: async (issuer: string) => {
            const res = await api.post<SsoConnectionTestResult>('/admin/sso/test', { issuer });
            return res.data;
        },
        onSuccess: (result) => setTestResult(result),
        onError: (error) => {
            setTestResult({ ok: false, message: getApiErrorMessage(error, 'Connection test failed') });
        },
    });

    const unlinkMutation = useMutation({
        mutationFn: async (identity: SsoLinkedIdentity) => {
            await api.delete(`/admin/sso/identities/${identity.userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'sso', 'identities'] });
            setUnlinking(null);
            toast.success('Identity unlinked');
        },
        onError: (error) => {
            toast.error(getApiErrorMessage(error, 'Could not unlink identity'));
        },
    });

    if (isError) {
        return <InlineErrorState description="SSO configuration is unavailable right now." />;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Single Sign-On"
                description="Let employees sign in with your corporate identity provider. Accounts stay provisioned by HR — this only controls how they authenticate."
            />

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Employees are never created by the identity provider</AlertTitle>
                <AlertDescription>
                    Add people under Users first. On their first sign-in, an existing account is matched by
                    email and then permanently linked to that directory identity. Anyone without an account
                    is refused.
                </AlertDescription>
            </Alert>

            <SectionCard
                title="Identity provider"
                description="OpenID Connect settings from your app registration."
            >
                {isLoading ? (
                    <TableLoadingState rows={4} />
                ) : (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
                            className="space-y-5"
                        >
                            <div className="grid gap-5 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="displayName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Button label</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Microsoft" {...field} />
                                            </FormControl>
                                            <FormDescription>Shown on the sign-in page.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="clientId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Application (client) ID" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="issuer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Issuer URL</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://login.microsoftonline.com/<tenant-id>/v2.0"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Directory-specific authority. Use your own tenant ID rather than
                                            <span className="font-mono"> /common</span> so only your organisation can sign in.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={testMutation.isPending || !form.watch('issuer')}
                                    onClick={() => {
                                        setTestResult(null);
                                        testMutation.mutate(form.getValues('issuer').replace(/\/$/, ''));
                                    }}
                                >
                                    {testMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <PlugZap className="mr-2 h-4 w-4" />
                                    )}
                                    Test connection
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Saves nothing — just checks the discovery document.
                                </span>
                            </div>

                            {testResult && (
                                <Alert variant={testResult.ok ? 'default' : 'destructive'}>
                                    {testResult.ok ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <AlertCircle className="h-4 w-4" />
                                    )}
                                    <AlertTitle>{testResult.ok ? 'Connection succeeded' : 'Connection failed'}</AlertTitle>
                                    <AlertDescription className="space-y-1">
                                        <p>{testResult.message}</p>
                                        {testResult.metadata && (
                                            <ul className="mt-2 space-y-0.5 font-mono text-xs">
                                                <li>issuer: {testResult.metadata.issuer}</li>
                                                <li>authorization: {testResult.metadata.authorizationEndpoint}</li>
                                                <li>token: {testResult.metadata.tokenEndpoint}</li>
                                                <li>keys: {testResult.metadata.keyCount}</li>
                                            </ul>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-5 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="tenantId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Directory (tenant) ID — recommended</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Leave blank only if you must" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Signs are accepted only when the token&apos;s tenant matches this value.
                                                This is what prevents personal Microsoft accounts from reaching the app.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="allowedEmailDomains"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Allowed email domains</FormLabel>
                                            <FormControl>
                                                <Input placeholder="example.com, example.de" {...field} />
                                            </FormControl>
                                            <FormDescription>Comma separated. Leave blank to allow any.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <FormField
                                    control={form.control}
                                    name="clientSecret"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Client secret</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    autoComplete="new-password"
                                                    placeholder={data?.hasClientSecret ? '•••••••• (stored)' : 'Enter secret'}
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                {data?.hasClientSecret
                                                    ? 'A secret is stored. Leave blank to keep it.'
                                                    : 'Encrypted at rest; never shown again after saving.'}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="scopes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Scopes</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-3 rounded-lg border p-4">
                                <FormField
                                    control={form.control}
                                    name="isEnabled"
                                    render={({ field }) => (
                                        <div className="flex items-start gap-3">
                                            <input
                                                id="sso-enabled"
                                                type="checkbox"
                                                className="mt-1 h-4 w-4 rounded border-input"
                                                checked={field.value}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                            />
                                            <div className="space-y-1">
                                                <Label htmlFor="sso-enabled" className="cursor-pointer">
                                                    Show &ldquo;Sign in with {form.watch('displayName') || 'SSO'}&rdquo; on the login page
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Password sign-in stays available, which is your break-glass path if the
                                                    identity provider is misconfigured.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="autoLinkByEmail"
                                    render={({ field }) => (
                                        <div className="flex items-start gap-3">
                                            <input
                                                id="sso-autolink"
                                                type="checkbox"
                                                className="mt-1 h-4 w-4 rounded border-input"
                                                checked={field.value}
                                                onChange={(e) => field.onChange(e.target.checked)}
                                            />
                                            <div className="space-y-1">
                                                <Label htmlFor="sso-autolink" className="cursor-pointer">
                                                    Link accounts by email on first sign-in
                                                </Label>
                                                <p className="text-sm text-muted-foreground">
                                                    Matches exactly one HR-provisioned account and binds the directory
                                                    identity to it. Turn off to require manual linking.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={saveMutation.isPending}>
                                    {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save settings
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </SectionCard>

            <SectionCard
                title="Linked identities"
                description="Directory identities bound to employee accounts. Unlinking forces the next sign-in to re-match by email."
            >
                {isLoadingIdentities ? (
                    <TableLoadingState rows={3} />
                ) : !identities || identities.length === 0 ? (
                    <TableEmptyState
                        title="No identities linked yet"
                        description="Links appear here the first time an employee signs in through the identity provider."
                    />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Directory subject</TableHead>
                                <TableHead>Linked</TableHead>
                                <TableHead className="w-[110px]">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {identities.map((identity) => (
                                <TableRow key={identity.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {identity.firstName} {identity.lastName}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{identity.email}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={identity.role === 'admin' ? 'default' : 'secondary'}>
                                            {identity.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[220px] truncate font-mono text-xs">
                                        {identity.subjectId}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {identity.lastLoginAt
                                            ? new Date(identity.lastLoginAt).toLocaleDateString()
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setUnlinking(identity)}
                                        >
                                            <Unlink className="mr-2 h-3.5 w-3.5" />
                                            Unlink
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </SectionCard>

            <ConfirmActionDialog
                open={Boolean(unlinking)}
                onOpenChange={(open) => !open && setUnlinking(null)}
                title="Unlink this identity?"
                description={
                    unlinking
                        ? `${unlinking.email} will need to sign in again to re-link, and will be refused if auto-linking is disabled.`
                        : ''
                }
                confirmLabel="Unlink"
                variant="destructive"
                onConfirm={() => unlinking && unlinkMutation.mutate(unlinking)}
                isLoading={unlinkMutation.isPending}
            />
        </div>
    );
}
