import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

const appEnv = import.meta.env.VITE_APP_ENV ?? "development";

// --- Configuration ---
export const serverHost = import.meta.env.VITE_SERVER_HOST;
if (!serverHost) {
  throw new Error("Server host (VITE_SERVER_HOST) is not defined in .env");
}

export const serverLocation =
  appEnv === "production" ? "" : import.meta.env.VITE_SERVER_LOCATION;
const refreshEndpoint = "/users/refresh"; // Your refresh token endpoint
const logoutEndpoint = "/users/logout"; // Your backend logout endpoint

if (serverLocation === undefined || serverLocation === null) {
  throw new Error(
    "Server location (VITE_SERVER_LOCATION) is not defined in .env",
  );
}

const baseURL = `${serverLocation}/api`;
console.info("Setting API base url to: ", baseURL);

// --- Helper Functions (Simplified) ---

// Decide where to store the access token: localStorage, sessionStorage, or in-memory
// localStorage is used here for persistence, but consider memory for slightly better XSS protection.
export const getAccessToken = (): string | null =>
  localStorage.getItem("accessToken");
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

    if (error.response?.status === 403) {
      window.location.href = "/";
    }

    // For errors other than 401 or handled retries, just return the promise rejection
    return Promise.reject(error);
  },
);

/**
 * Proactively refreshes the access token.
 * This function is safe to call from anywhere in the application.
 * It uses the same `isRefreshing` lock and queueing mechanism as the interceptor
 * to prevent multiple refresh requests from firing simultaneously.
 *
 * @returns {Promise<string>} A promise that resolves with the new access token.
 * @throws {Error} Throws an error if the token refresh fails, which will also trigger a logout.
 */
export const refreshToken = async (): Promise<string> => {
  // If a refresh is already in progress, wait for it to complete.
  if (isRefreshing) {
    console.info("A token refresh is already in progress. Waiting...");
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    }).then((token) => token as string);
  }

  isRefreshing = true;

  try {
    console.info("Proactively refreshing token...");
    const response = await api.post<{ data: { accessToken: string } }>(
      refreshEndpoint,
      {},
    );
    const { accessToken } = response.data.data;

    setAccessToken(accessToken); // Store the new token
    processQueue(null, accessToken); // Resolve any queued requests

    console.info("Token refreshed successfully.");
    return accessToken;
  } catch (error: any) {
    console.error("Proactive token refresh failed:", error);
    processQueue(error, null); // Reject any queued requests
    await _logoutHandler(); // Logout on failure
    // Rethrow the error so the calling function knows the refresh failed
    return Promise.reject(error);
  } finally {
    isRefreshing = false;
  }
};
