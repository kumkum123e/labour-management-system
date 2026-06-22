import axios from "axios";

const getBackendUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const hostname = window.location.hostname;
  return `http://${hostname}:5000`;
};

const API = getBackendUrl();

const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.endsWith("-login")) {
        if (path.startsWith("/admin")) {
          window.location.href = "/admin-login";
        } else if (path.startsWith("/hod")) {
          window.location.href = "/hod-login";
        } else if (path.startsWith("/labour")) {
          window.location.href = "/labour-login";
        } else if (path.startsWith("/security")) {
          window.location.href = "/labour-login";
        } else {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
