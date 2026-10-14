import axios, { type AxiosError } from 'axios';
import { queryClient } from './queryClient';

/** Origin of the API (no trailing slash), e.g. https://api.remotedays.app */
export const API_ORIGIN = import.meta.env.VITE_API_URL || '';

/** Versioned API base, e.g. https://api.remotedays.app/v1 */
export const API_BASE_URL = `${API_ORIGIN}/v1`;

/**
 * Absolute URL for endpoints that must be reached by *browser navigation*
 * rather than XHR — notably the OIDC sign-in start, which issues a redirect to
 * the identity provider and therefore cannot use axios.
 */
export function apiUrl(path: string): string {
    return `${API_BASE_URL}${path}`;
}

const api = axios.create({
    baseURL: API_BASE_URL,
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
