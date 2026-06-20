import api from "./api";

export const getAdminDashboard = () => api.get("/api/dashboard/admin").then((r) => r.data);
export const getHodDashboard = () => api.get("/api/dashboard/hod").then((r) => r.data);
export const getLabourDashboard = () => api.get("/api/dashboard/labour").then((r) => r.data);
