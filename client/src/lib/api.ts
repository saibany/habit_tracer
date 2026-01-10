import axios from 'axios';

const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true, // Send cookies with requests
    headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest' // CSRF protection indicator
    },
    timeout: 10000, // 10 second timeout - fail fast

});

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh retry for auth endpoints to prevent infinite loops
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');

        // Handle 401 errors (unauthorized) - only retry if:
        // 1. It's a 401 error
        // 2. We haven't already tried to refresh
        // 3. It's NOT an auth endpoint (to prevent infinite loops)
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;

            try {
                // Attempt to refresh the token
                await api.post('/auth/refresh');

                // Retry the original request
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh fails, let the error propagate
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
