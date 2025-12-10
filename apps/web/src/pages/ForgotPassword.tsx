import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const onSubmit = async (values: ForgotPasswordFormValues) => {
        setIsLoading(true);
        try {
            await api.post('/auth/password-reset-request', values);
            setIsSubmitted(true);
        } catch (error) {
            console.error('Password reset request failed:', error);
            toast.error('Failed to send password reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Check your email</CardTitle>
                        <CardDescription>
                            We have sent a password reset link to your email address.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500 mb-4">
                            Please check your inbox and follow the instructions to reset your password.
                            If you don't receive an email within a few minutes, please check your spam folder.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full" variant="outline">
                            <Link to="/login">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Forgot Password</CardTitle>
                    <CardDescription>
                        Enter your email address and we'll send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="m.scott@dunder-mifflin.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link to="/login" className="text-sm text-primary hover:underline flex items-center">
                        <ArrowLeft className="mr-1 h-3 w-3" /> Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
