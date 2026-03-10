
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-slate-200">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold text-slate-900">
                        Work Location Check-in
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center py-6 space-y-6">

                    {status === 'loading' && (
                        <div className="flex flex-col items-center space-y-4">
                            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                            <p className="text-slate-600 font-medium">Verifying your response...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-10 w-10 text-green-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-slate-800">Success!</h3>
                                <p className="text-slate-600">
                                    You have been marked as <span className="font-bold text-slate-900 uppercase">{details?.status}</span> for <span className="font-medium">{details?.date}</span>.
                                </p>
                            </div>
                            <Button
                                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => navigate('/login')}
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                                <XCircle className="h-10 w-10 text-red-600" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-semibold text-slate-800">Something went wrong</h3>
                                <p className="text-red-500 font-medium px-4">
                                    {message}
                                </p>
                                <p className="text-sm text-slate-500">
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
