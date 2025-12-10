import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    roles?: string[];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen w-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (roles && user && !roles.includes(user.role)) {
        return <Navigate to="/" replace />; // Unauthorized, go to dashboard
    }

    return <Outlet />;
}
