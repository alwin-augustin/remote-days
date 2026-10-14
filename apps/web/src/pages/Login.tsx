
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { api, apiUrl } from '@/lib/api';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { SsoPublicConfig } from '@remotedays/types';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

/**
 * The SSO callback redirects failures here with a machine-readable code so the
 * user sees why they were refused rather than a blank page.
 */
const SSO_ERROR_MESSAGES: Record<string, string> = {
    disabled: 'Single sign-on is not currently enabled for this workspace.',
    not_configured: 'Single sign-on has not been configured yet. Please contact your administrator.',
    provider_error: "Your organisation's sign-in service could not be reached, or it refused the request. Please try again.",
    invalid_request: 'That sign-in attempt expired or was invalid. Please try again.',
    invalid_token: 'We could not verify the response from your sign-in service. Please try again.',
    tenant_mismatch: 'That account belongs to a different organisation. Please sign in with your work account.',
    domain_not_allowed: 'Your email domain is not permitted for this application.',
    not_provisioned: 'No account is set up for your address yet. Please contact your HR administrator.',
    deactivated: 'Your account has been deactivated. Please contact your HR administrator.',
    ambiguous_account: 'Several accounts match your address. Please ask an administrator to link your account.',
};

function ssoErrorMessage(code: string | null): string | null {
    if (!code) return null;
    return SSO_ERROR_MESSAGES[code] ?? 'Single sign-on failed. Please try again or use your password.';
}

export default function Login() {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const ssoError = ssoErrorMessage(searchParams.get('sso_error'));

    // Only render the SSO affordance when the deployment actually has it on.
    const { data: ssoConfig } = useQuery({
        queryKey: ['sso', 'status'],
        queryFn: async () => {
            const res = await api.get<SsoPublicConfig>('/auth/sso/status');
            return res.data;
        },
        staleTime: 1000 * 60 * 10,
        retry: false,
    });

    // A full-page navigation (not XHR): this endpoint redirects to the identity
    // provider and must set the short-lived login-transaction cookie.
    const startSso = () => {
        window.location.href = apiUrl('/auth/sso/start?redirect=/');
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setError(null);
        try {
            await login(values);
        } catch (err: unknown) {
            logger.error('Login failed', err, { email: values.email });
            setError("Invalid credentials or server error");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
            <div className="mb-8 flex flex-col items-center">
                <img src="/logo.svg" alt="Remote Days Logo" className="h-20 w-20 mb-4 rounded-xl shadow-lg" />
                <h1 className="text-3xl font-bold text-primary">Remote Days</h1>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Login</CardTitle>
                    <CardDescription>
                        Sign in to declare today’s work location, review compliance, or manage your team depending on your role.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {(ssoError || error) && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{ssoError ?? error}</AlertDescription>
                        </Alert>
                    )}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m@example.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Password</FormLabel>
                                            {/* <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a> */}
                                        </div>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end mb-4">
                                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>
                        </form>
                    </Form>

                    {ssoConfig?.enabled && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                                    <span className="bg-card px-2 text-muted-foreground">or</span>
                                </div>
                            </div>
                            <Button type="button" variant="outline" className="w-full" onClick={startSso}>
                                <Building2 className="mr-2 h-4 w-4" />
                                Sign in with {ssoConfig.displayName}
                            </Button>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    {/* Demo Credentials */}
                    <div className="w-full rounded-lg border border-info-border bg-info-muted p-4">
                        <p className="mb-3 text-center text-sm font-medium text-info-muted-foreground">Demo credentials</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-info-muted-foreground">Admin</span>
                                <div className="text-right">
                                    <span className="font-mono text-xs text-info-muted-foreground">admin@remotedays.app</span>
                                    <span className="mx-1 opacity-60">/</span>
                                    <span className="font-mono text-xs text-info-muted-foreground">password123</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-info-muted-foreground">Employee</span>
                                <div className="text-right">
                                    <span className="font-mono text-xs text-info-muted-foreground">employee@remotedays.app</span>
                                    <span className="mx-1 opacity-60">/</span>
                                    <span className="font-mono text-xs text-info-muted-foreground">password123</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                        Need an account? Contact your HR administrator.
                    </div>
                    <div className="mt-2 text-center text-xs text-muted-foreground/80">
                        <Link to="/legal/privacy" className="hover:underline">Privacy Policy</Link>
                        {' | '}
                        <Link to="/legal/terms" className="hover:underline">Terms of Service</Link>
                        {' | '}
                        <Link to="/legal/cookies" className="hover:underline">Cookies</Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
