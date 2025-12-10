
import { useAuth } from '@/context/AuthContext';
import Dashboard from '@/pages/Dashboard';
import EmployeeSummary from '@/pages/hr/EmployeeSummary';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (user?.role === 'admin' || user?.role === 'hr') {
        return <EmployeeSummary />;
    }

    // Default to Personal Dashboard for employees (or unknown)
    return <Dashboard />;
}
