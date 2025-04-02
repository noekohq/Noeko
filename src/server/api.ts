import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const serverLocation = import.meta.env.VITE_SERVER_LOCATION;

if (!serverLocation) {
  throw new Error("Server location (VITE_SERVER_LOCATION) is not defined");
}

export const api = axios.create({
  baseURL: `${serverLocation}/api`,
});

// --- Request Interceptor ---
// Adds the access token to the Authorization header for outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken"); // Changed to accessToken for clarity
    if (token && !config.headers.Authorization) {
      // Avoid overwriting if already set (e.g., during retry)
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response Interceptor ---
// Handles token expiration and refresh logic

let isRefreshing = false;
// Stores requests that failed due to 401 while a refresh was in progress
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token); // Resolve with the new token for retry logic
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response, // Simply return successful responses
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if it's a 401 error and not a retry attempt or the refresh token request itself
    if (
      error.response?.status === 401 &&
      originalRequest.url !== "/users/refresh" &&
      !originalRequest._retry
    ) {
      if (isRefreshing) {
        // If a refresh is already happening, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // Retry the original request with the new token from the successful refresh
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest); // Re-run the request using the updated api instance config
          })
          .catch((err) => {
            // The refresh attempt failed, propagate the error
            return Promise.reject(err);
          });
      }

      // Mark that we are refreshing and set the retry flag on the original request
      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        console.error("No refresh token available.");
        isRefreshing = false; // Reset flag
        localStorage.removeItem("accessToken"); // Clear potentially invalid access token
        window.location.href = "/login"; // Redirect to login
        return Promise.reject(error); // Reject the original request
      }

      try {
        console.log("Attempting token refresh...");
        const refreshResponse = await axios.post<{
          accessToken: string;
          refreshToken?: string;
        }>( // Define expected response shape
          `${serverLocation}/api/users/refresh`, // Use the full URL or configure another axios instance if needed
          { refreshToken }, // Send refreshToken in the body
          { headers: { "Content-Type": "application/json" } }, // Ensure correct content type
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          refreshResponse.data;

        // Store the new tokens
        localStorage.setItem("accessToken", newAccessToken);
        if (newRefreshToken) {
          // If the server sends back a new refresh token (rotation), store it
          localStorage.setItem("refreshToken", newRefreshToken);
          console.log("Refreshed both access and refresh tokens.");
        } else {
          console.log("Refreshed access token.");
        }

        // Update the Authorization header for the original request
        api.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`; // Update default header for subsequent requests
        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }

        // Process the queue with the new token
        processQueue(null, newAccessToken);

        // Retry the original request with the new token
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Clear tokens and redirect on refresh failure
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";

        // Reject queued requests and the original request
        processQueue(refreshError as AxiosError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Reset refreshing state regardless of outcome
      }
    } else if (
      error.response?.status === 401 &&
      originalRequest.url === "/users/refresh"
    ) {
      // If the refresh token request itself returns 401, redirect immediately
      console.error("Refresh token is invalid or expired.");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
      // Make sure to reject ongoing requests if refresh fails definitively
      processQueue(error, null);
      isRefreshing = false; // Ensure flag is reset
    }

    // For errors other than 401, or for retried requests that still fail, just reject
    return Promise.reject(error);
  },
);
