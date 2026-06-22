import api from "./api";

export const getDepartments = () => api.get("/api/departments").then((r) => r.data);
export const getDepartmentsAdmin = () => api.get("/api/departments/admin").then((r) => r.data);
export const getDepartmentHods = (id) =>
  api.get(`/api/departments/${id}/hods`).then((r) => r.data);
export const addDepartment = (payload) =>
  api.post("/api/departments/inline", payload).then((r) => r.data);
export const updateDepartment = (id, payload) =>
  api.put(`/api/departments/${id}`, payload).then((r) => r.data);
export const deleteDepartment = (id) =>
  api.delete(`/api/departments/${id}`).then((r) => r.data);
