import React, { createContext, useContext, useEffect } from 'react';
import type { User } from '@remotedays/types';
import { api } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';

export interface LoginCredentials {
    email: string;
    password?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (data: LoginCredentials) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();

    const { data: user, isLoading } = useQuery({
        queryKey: ['auth', 'user'],
        queryFn: async () => {
            try {
                const res = await api.get<User>('/auth/me');
                return res.data;
            } catch {
                return null;
            }
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    const login = async (credentials: LoginCredentials) => {
        await api.post('/auth/login', credentials);
        await queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
        navigate('/');
    };

    const logout = async () => {
        await api.post('/auth/logout');
        queryClient.setQueryData(['auth', 'user'], null);
        navigate('/login');
    };

    useEffect(() => {
        if (!isLoading && !user && !location.pathname.startsWith('/login')) {
            // Optional: Redirect logic can be handled here or in ProtectedRoute
        }
    }, [user, isLoading, location]);

    return (
        <AuthContext.Provider value={{ user: user || null, isLoading, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
