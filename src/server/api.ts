import axios from "axios";
// import { io, Socket } from "socket.io-client";

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
