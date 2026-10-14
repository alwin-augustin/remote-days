
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api, getApiErrorMessage } from '@/lib/api';

export default function CtaPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
    const [message, setMessage] = useState(token ? '' : 'Invalid link: Missing token.');
    const [details, setDetails] = useState<{ status: string; date: string } | null>(null);

    useEffect(() => {
        if (!token) return;

        const processToken = async () => {
            try {
                const res = await api.post<{ message: string; status: string; date: string }>('/cta/redemptions', { token, email });
                setStatus('success');
                setMessage(res.data.message);
                setDetails({ status: res.data.status, date: res.data.date });
            } catch (err: unknown) {
                setStatus('error');
                const errorMsg = getApiErrorMessage(err, 'Failed to process request.');
                setMessage(errorMsg);
            }
        };

        processToken();
    }, [token, email]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md shadow-sm">
                <CardHeader className="pb-2 text-center">
                    <CardTitle className="text-2xl font-bold text-foreground">
                        Work Location Check-in
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-6 space-y-6">

                    {status === 'loading' && (
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="font-medium text-muted-foreground">Verifying your response...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-success-muted">
                                <CheckCircle2 className="h-10 w-10 text-success-muted-foreground" />
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="text-xl font-semibold text-foreground">Success!</h3>
                                <p className="text-muted-foreground">
                                    You have been marked as <span className="font-bold uppercase text-foreground">{details?.status}</span> for <span className="font-medium">{details?.date}</span>.
                                </p>
                            </div>
                            <Button
                                className="mt-4 w-full"
                                onClick={() => navigate('/login')}
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-danger-muted">
                                <XCircle className="h-10 w-10 text-danger-muted-foreground" />
                            </div>
                            <div className="space-y-2 text-center">
                                <h3 className="text-xl font-semibold text-foreground">Something went wrong</h3>
                                <p className="px-4 font-medium text-danger-muted-foreground">
                                    {message}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    The link may be expired or already used.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => navigate('/login')}
                            >
                                Return to Login
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    );
}
