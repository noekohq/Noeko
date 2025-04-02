import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// --- Configuration ---
// Ensure VITE_SERVER_LOCATION is defined in your .env file
const serverLocation = import.meta.env.VITE_SERVER_LOCATION;
const refreshEndpoint = "/users/refresh"; // Your refresh token endpoint

if (!serverLocation) {
  throw new Error(
    "Server location (VITE_SERVER_LOCATION) is not defined in .env",
  );
}

const baseURL = `${serverLocation}/api`;

// --- Helper Functions ---

const getToken = (): string | null => localStorage.getItem("token");
const getRefreshToken = (): string | null =>
  localStorage.getItem("refreshToken");
const setToken = (token: string): void => localStorage.setItem("token", token);
const setRefreshToken = (refreshToken: string): void =>
  localStorage.setItem("refreshToken", refreshToken);
const removeTokens = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
};

// --- Axios Instance Creation ---

export const api = axios.create({
  baseURL: baseURL,
});

// --- Request Interceptor ---
// Adds the Authorization header to outgoing requests

api.interceptors.request.use(
  (config): InternalAxiosRequestConfig => {
    const token = getToken();
    if (token && !config.headers.Authorization) {
      // Add token if not already present
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error): Promise<AxiosError> => {
    // Handle request configuration errors
    console.error("Request config error:", error);
    return Promise.reject(error);
  },
);

// --- Response Interceptor ---
// Handles 401 errors and token refreshing

let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx cause this function to trigger
    return response;
  },
  async (error: AxiosError) => {
    // Any status codes outside the range of 2xx cause this function to trigger
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check for 401 Unauthorized and ensure it's not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      originalRequest.url !== refreshEndpoint
    ) {
      if (isRefreshing) {
        // If token is already being refreshed, queue the original request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers["Authorization"] = "Bearer " + token;
            }
            return api(originalRequest); // Retry with new token
          })
          .catch((err) => {
            return Promise.reject(err); // Propagate the error if refresh failed
          });
      }

      originalRequest._retry = true; // Mark request to avoid infinite loops if refresh fails repeatedly
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        console.error("No refresh token available.");
        isRefreshing = false;
        // --- Logout Logic Here ---
        // Example: Redirect to login or trigger global logout state
        removeTokens();
        // window.location.href = '/login'; // Consider using React Router's navigate for better UX
        processQueue(new Error("No refresh token, user logged out."), null);
        return Promise.reject(error);
      }

      try {
        console.log("Attempting token refresh...");
        const refreshResponse = await axios.post<{
          accessToken: string;
          refreshToken?: string;
        }>( // Adjust<{...}> based on your API response
          `${baseURL}${refreshEndpoint}`,
          { refreshToken: refreshToken }, // Send refreshToken in the body
        );

        const { accessToken, refreshToken: newRefreshToken } =
          refreshResponse.data;

        console.log("Token refresh successful.");
        setToken(accessToken);
        if (newRefreshToken) {
          // Handle if your backend sends back a new refresh token
          setRefreshToken(newRefreshToken);
        }

        // Update the Authorization header for the current request
        if (api.defaults.headers.common) {
          api.defaults.headers.common["Authorization"] =
            `Bearer ${accessToken}`;
        }
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken); // Process queued requests with the new token
        return api(originalRequest); // Retry the original request
      } catch (refreshError: any) {
        console.error(
          "Token refresh failed:",
          refreshError?.response?.data || refreshError.message,
        );
        removeTokens();
        processQueue(refreshError, null); // Reject queued requests
        // --- Logout Logic Here ---
        // Example: Redirect to login or trigger global logout state
        // window.location.href = '/login'; // Consider using React Router's navigate
        return Promise.reject(refreshError); // Reject the original request's promise
      } finally {
        isRefreshing = false;
      }
    }

    // For errors other than 401, just return the promise rejection
    return Promise.reject(error);
  },
);

// --- React Integration Considerations ---

// 1. Logout:
//    - Instead of `window.location.href`, it's better to integrate with your app's state management (Context, Redux, Zustand) or routing (React Router).
//    - You might need to pass a `logout` function or React Router's `Maps` function into this module during setup, or emit a custom event that your UI layer listens for.
//    Example using a callback:
/*
let _logoutHandler: () => void = () => {
  console.warn("Logout handler not configured in axiosInstance.");
  removeTokens();
  window.location.href = '/login'; // Fallback
};

export const configureAxiosInterceptors = (logoutHandler: () => void) => {
 _logoutHandler = logoutHandler;
};

// Inside the catch blocks where logout is needed:
_logoutHandler();
*/

// 2. Token Storage:
//    - `localStorage` is simple but vulnerable to XSS. Consider `sessionStorage` (clears on tab close) or storing tokens in memory within your auth state manager (more secure but requires fetching on app load). HttpOnly cookies set by the backend are the most secure method if you control the backend.

// 3. Environment Variables:
//    - Make sure `VITE_SERVER_LOCATION` is correctly set in your `.env` file(s) (e.g., `.env.development`, `.env.production`).

// --- Usage in React Components ---
/*
import { api } from './api/axiosInstance';
import { useEffect, useState } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/protected-data');
        setData(response.data);
        setError(null);
      } catch (err: any) {
         console.error("Failed to fetch data:", err);
         // Handle error display in UI - check if it's an auth error leading to logout
         if (err.message?.includes("refresh failed") || err.response?.status === 401) {
            // The interceptor likely handled logout, maybe show a "Session expired" message
            setError("Your session may have expired. Please log in again.");
         } else {
           setError(err.message || 'An unknown error occurred');
         }
      }
    };

    fetchData();
  }, []);

  // Render logic based on data and error states...
}
*/
