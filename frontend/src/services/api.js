import axios from "axios";

// Environment-based backend API base URL with fallback to localhost:5000
const rawApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: automatically attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("lifelink_token") ||
      sessionStorage.getItem("lifelink_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthorized / expired tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do not redirect if already on login or register (e.g. invalid credentials)
      const currentPath = window.location.pathname;
      const isAuthRoute =
        currentPath === "/login" || currentPath === "/register";

      if (!isAuthRoute) {
        localStorage.removeItem("lifelink_token");
        localStorage.removeItem("lifelink_user");
        sessionStorage.removeItem("lifelink_token");
        sessionStorage.removeItem("lifelink_user");

        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
