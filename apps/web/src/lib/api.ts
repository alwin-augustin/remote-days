import axios, { type AxiosError } from 'axios';
import { queryClient } from './queryClient';

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL || ''}/v1`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

type ApiErrorBody = { error?: { message?: string; code?: string } };

/**
 * Extracts a user-facing error message from an Axios error.
 * Handles the backend error envelope: { error: { message, code, statusCode } }
 */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
    const axiosError = error as AxiosError<ApiErrorBody>;
    return axiosError?.response?.data?.error?.message || fallback;
}

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // On 401, clear auth state and redirect — skip for /auth/me to avoid
        // a redirect loop during the initial session check on page load.
        if (
            error.response?.status === 401 &&
            !error.config?.url?.includes('/auth/me')
        ) {
            queryClient.setQueryData(['auth', 'user'], null);
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export { api };
