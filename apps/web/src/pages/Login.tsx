
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
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
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export default function Login() {
    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

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
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
            <div className="mb-8 flex flex-col items-center">
                <img src="/logo.png" alt="Remote Days Logo" className="h-20 w-20 mb-4 rounded-xl shadow-lg" />
                <h1 className="text-3xl font-bold text-primary">Remote Days</h1>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Login</CardTitle>
                    <CardDescription>
                        Enter your email and password to access your account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
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
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    {/* Demo Credentials */}
                    <div className="w-full rounded-lg bg-blue-50 border border-blue-200 p-4">
                        <p className="text-sm font-medium text-blue-800 mb-3 text-center">Demo Credentials</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-700 font-medium">Admin:</span>
                                <div className="text-right">
                                    <span className="text-blue-900 font-mono text-xs">admin@remotedays.app</span>
                                    <span className="text-blue-400 mx-1">/</span>
                                    <span className="text-blue-900 font-mono text-xs">password123</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-blue-700 font-medium">Employee:</span>
                                <div className="text-right">
                                    <span className="text-blue-900 font-mono text-xs">employee@remotedays.app</span>
                                    <span className="text-blue-400 mx-1">/</span>
                                    <span className="text-blue-900 font-mono text-xs">password123</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-sm text-gray-500">
                        Need an account? Contact your HR administrator.
                    </div>
                    <div className="text-center text-xs text-gray-400 mt-2">
                        <a href="https://remotedays.app/legal/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a>
                        {' | '}
                        <a href="https://remotedays.app/legal/terms.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms of Service</a>
                        {' | '}
                        <a href="https://remotedays.app/legal/cookies.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Cookies</a>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
