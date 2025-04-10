import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

// --- Configuration ---
const serverLocation = import.meta.env.VITE_SERVER_LOCATION;
const refreshEndpoint = "/users/refresh"; // Your refresh token endpoint
const logoutEndpoint = "/users/logout"; // Your backend logout endpoint

if (!serverLocation) {
  throw new Error(
    "Server location (VITE_SERVER_LOCATION) is not defined in .env",
  );
}

const baseURL = `${serverLocation}/api`;

// --- Helper Functions (Simplified) ---

// Decide where to store the access token: localStorage, sessionStorage, or in-memory
// localStorage is used here for persistence, but consider memory for slightly better XSS protection.
const getAccessToken = (): string | null => localStorage.getItem("accessToken");
const setAccessToken = (token: string): void =>
  localStorage.setItem("accessToken", token);
const removeAccessToken = (): void => {
  localStorage.removeItem("accessToken");
};

// --- Axios Instance Creation ---

export const api = axios.create({
  baseURL: baseURL,
  // Crucial: Send cookies with requests, necessary for the HttpOnly refresh token
  withCredentials: true,
});

// --- Request Interceptor ---
// Adds the Authorization header (Access Token) to outgoing requests

api.interceptors.request.use(
  (config): InternalAxiosRequestConfig => {
    const accessToken = getAccessToken();
    // Add token only if it exists and the header isn't already set
    // Important: Don't add Authorization header to the refresh request itself
    // if your backend expects *only* the cookie for refresh authentication.
    // Check if your backend refresh endpoint requires the Authorization header or not.
    // Assuming here it does NOT require Authorization header, only the cookie.
    if (
      accessToken &&
      !config.headers.Authorization &&
      config.url !== refreshEndpoint
    ) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error): Promise<AxiosError> => {
    console.error("Request config error:", error);
    return Promise.reject(error);
  },
);

// --- Response Interceptor ---
// Handles 401 errors (Access Token expired) and triggers token refreshing

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
      prom.resolve(token); // Resolve with the new access token
    }
  });
  failedQueue = [];
};

// --- Logout Function ---
// Needs to be callable by the interceptor. Could be passed in or managed via state.
// IMPORTANT: This function MUST call the backend logout endpoint.
let _logoutHandler: () => Promise<void> = async () => {
  console.warn("Logout handler not configured. Attempting basic cleanup.");
  removeAccessToken();
  // Make a request to the backend logout endpoint to clear the HttpOnly cookie
  try {
    // Ensure this request also goes with credentials if needed by backend
    await api.post(logoutEndpoint, {}, { withCredentials: true });
  } catch (logoutError) {
    console.error("Backend logout call failed:", logoutError);
    // Still proceed with frontend cleanup & potential redirect
  }
  // Redirect or update state after attempting backend logout
  // Example: window.location.href = '/login'; // Use React Router navigate instead
};

// Function to configure the logout handler (e.g., from your Auth context)
export const configureLogoutHandler = (logoutHandler: () => Promise<void>) => {
  _logoutHandler = logoutHandler;
};

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Any status code within the range of 2xx cause this function to trigger
    return response;
  },
  async (error: AxiosError) => {
    // Any status codes outside the range of 2xx cause this function to trigger
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check for 401 Unauthorized, ensure it's not a retry, and not the refresh endpoint itself failing
    if (
      error.response?.status === 401 &&
      originalRequest.url !== refreshEndpoint &&
      !originalRequest._retry // Important to prevent infinite loops if refresh fails with 401
    ) {
      if (isRefreshing) {
        // If token is already being refreshed, queue the original request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newAccessToken) => {
            // Update header of the queued request with the new access token
            if (originalRequest.headers) {
              originalRequest.headers["Authorization"] =
                "Bearer " + newAccessToken;
            }
            return api(originalRequest); // Retry with new token
          })
          .catch((err) => {
            return Promise.reject(err); // Propagate the error if refresh failed
          });
      }

      originalRequest._retry = true; // Mark request to avoid infinite loops
      isRefreshing = true;

      try {
        // Make the refresh request. The browser automatically sends the HttpOnly cookie
        // because `withCredentials: true` is set on the Axios instance.
        // We don't send the refresh token in the body.
        const refreshResponse = await api.post<{
          data: { accessToken: string };
        }>( // Adjust<{...}> based on your API response
          refreshEndpoint,
          {}, // Empty body, refresh token is in the cookie
          // Redundant if withCredentials is global, but explicit for clarity
          // { withCredentials: true }
        );

        const accessToken = refreshResponse.data.data.accessToken;

        setAccessToken(accessToken); // Store the new access token

        // Update the Authorization header for the current failed request
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        }

        // Process queued requests with the new access token
        console.info("Processing queued requests");
        processQueue(null, accessToken);

        // Retry the original request with the new access token
        return api(originalRequest);
      } catch (refreshError: any) {
        console.error(
          "Token refresh failed:",
          refreshError?.response?.data || refreshError.message,
        );

        // Refresh failed, likely invalid/expired refresh token cookie. Log out.
        processQueue(refreshError, null); // Reject queued requests
        await _logoutHandler(); // Trigger the configured logout process (clears access token, calls backend logout)
        return Promise.reject(refreshError); // Reject the original request's promise
      } finally {
        isRefreshing = false;
      }
    }

    // For errors other than 401 or handled retries, just return the promise rejection
    return Promise.reject(error);
  },
);

// --- React Integration Considerations (Updated) ---

// 1. Logout Handler Configuration:
//    - In your main App component or Auth Context setup, import and call `configureLogoutHandler`.
//    - Pass a function that clears frontend state (e.g., user context), calls `removeAccessToken()`, makes the necessary backend `/logout` call, and redirects using React Router's `Maps`.
/*
   // Example in an AuthContext.tsx
   import { configureLogoutHandler, api, removeAccessToken } from './api/axiosInstance';
   import { useNavigate } from 'react-router-dom';
   import { useCallback, useEffect } from 'react';

   const AuthProvider = ({ children }) => {
     const navigate = useNavigate();

     const handleLogout = useCallback(async () => {
       console.log("Executing logout handler...");
       removeAccessToken(); // Clear frontend token state/storage
       try {
         // Call backend to clear HttpOnly cookie
         await api.post('/users/logout', {}, { withCredentials: true });
         console.log("Backend logout successful.");
       } catch (error) {
         console.error("Backend logout failed:", error);
         // Decide how to handle this - usually proceed with frontend logout anyway
       } finally {
         // Clear any other user state (e.g., context state) here
         // setUser(null);
         navigate('/login'); // Redirect to login
       }
     }, [navigate]);

     useEffect(() => {
       // Configure the handler when the auth provider mounts
       configureLogoutHandler(handleLogout);
     }, [handleLogout]);

     // ... rest of your auth context logic
     return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
   }
*/

// 2. Access Token Storage:
//    - `localStorage` was used above. Consider `sessionStorage` (clears on tab close) or storing the access token in React's memory state (e.g., in your Auth Context). Storing in memory is generally safer against XSS but requires refetching/refreshing on page load/app start. HttpOnly cookies are the most secure for the *refresh token*.

// 3. Environment Variables:
//    - Still ensure `VITE_SERVER_LOCATION` is correctly set.

// 4. CSRF Protection:
//    - If your backend uses cookie-based sessions or requires CSRF protection (highly recommended, especially with `withCredentials: true`), ensure your Axios setup handles CSRF tokens correctly (often involving reading a CSRF cookie and sending it back in a header like `X-CSRF-TOKEN`). Axios might need further interceptor logic for this depending on your backend framework.

// --- Usage in React Components (Mostly Unchanged) ---
// The component usage remains largely the same, but error handling might
// simplify slightly as logout is more centrally managed.
/*
import { api } from './api/axiosInstance';
import { useEffect, useState } from 'react';

function MyComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/protected-data');
        setData(response.data);
        setError(null);
      } catch (err: any) {
         console.error("Failed to fetch data:", err);
         // Check if the error indicates a logout occurred via interceptor
         if (err.message?.includes("Token refresh failed")) {
             // Interceptor handled logout, maybe show a generic "Session expired" or rely on redirect
             setError("Your session has expired. Redirecting to login...");
             // Note: The actual redirect is handled by the configured logout handler
         } else if (err.response?.status === 401) {
             // This might happen if the initial token is bad / logout already happened
              setError("Authentication failed. Please log in.");
         }
          else {
            setError(err.response?.data?.message || err.message || 'An unknown error occurred');
          }
      } finally {
          setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  // Render logic based on data ...
}
*/
