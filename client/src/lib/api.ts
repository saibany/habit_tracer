import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true, // Send cookies with requests
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' // CSRF protection indicator
    },
    timeout: 10000, // 10 second timeout - fail fast
    validateStatus: (status) => status < 500 // Don't throw on 4xx errors
});

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (unauthorized) and ensure we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh the token
                await api.post('/auth/refresh');

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, redirect to login or let AuthContext handle the logout state
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
