import api from "./api";

export const getOutingRequests = () => api.get("/api/outing-requests").then((r) => r.data);
export const createOutingRequest = (payload) =>
  api.post("/api/outing-requests", payload).then((r) => r.data);
export const approveRequest = (id, remarks) =>
  api.put(`/api/outing/${id}/approve`, { remarks }).then((r) => r.data);
export const rejectRequest = (id, remarks) =>
  api.put(`/api/outing/${id}/reject`, { remarks }).then((r) => r.data);
export const getAdminMonitor = () =>
  api.get("/api/outing-requests/admin/monitor").then((r) => r.data);
