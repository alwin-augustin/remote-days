import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api', // Proxy handles request to localhost:3000
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // if (error.response?.status === 401) {
        //     if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/reset-password')) {
        //         window.location.href = '/login';
        //     }
        // }
        return Promise.reject(error);
    }
);

export { api };
