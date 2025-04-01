import axios from "axios";

const serverLocation = import.meta.env.VITE_SERVER_LOCATION;

if (!serverLocation) {
  throw new Error("Server location (VITE_SERVER_LOCATION) is not defined");
}

export const api = axios.create({
  baseURL: `${serverLocation}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
