import api from "./api";

export const login = (username, password) =>
  api.post("/api/auth/login", { username, password }).then((r) => r.data);

export const register = (payload) =>
  api.post("/api/auth/register", payload).then((r) => r.data);

export const checkNetworkStatus = () =>
  api.get("/api/auth/network-status").then((r) => r.data);
