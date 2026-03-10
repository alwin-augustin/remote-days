import { useState, useRef } from 'react';
import { api, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Upload, ArrowLeft } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { SectionCard } from '@/components/SectionCard';

interface ImportError {
    row: number;
    email?: string;
    error: string;
}

interface ImportResult {
    total: number;
    inserted: number;
    errors: ImportError[];
}

export default function UserImport() {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsLoading(true);
        try {
            const res = await api.post<ImportResult>('/admin/users/batch', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setResult(res.data);
            if (res.data.inserted > 0) {
                toast.success(`Successfully imported ${res.data.inserted} users`);
            } else if (res.data.errors.length > 0) {
                toast.warning('Import completed with errors');
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Failed to upload CSV'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <PageHeader
                title="User Import"
                actions={
                    <Button variant="outline" onClick={() => navigate('/admin/users')}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to Users
                    </Button>
                }
            />

            <SectionCard
                title="Upload CSV"
                description="Use a CSV with the headers email, first_name, last_name, country_of_residence, and work_country."
                contentClassName="pt-6"
            >
                <CardContent className="space-y-4 px-0 pb-0">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleFileChange}
                        />
                    </div>
                    <Button onClick={handleUpload} disabled={!file || isLoading}>
                        {isLoading ? (
                            <>Uploading...</>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" /> Import Users
                            </>
                        )}
                    </Button>
                </CardContent>
            </SectionCard>

            {result && (
                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{result.total}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Successfully Imported</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {result.errors.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-red-600 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" /> Import Errors
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Row</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Error</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {result.errors.map((err, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{err.row}</TableCell>
                                                <TableCell>{err.email || '-'}</TableCell>
                                                <TableCell className="text-red-600">{err.error}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
