import api from "./api";

export const getLabours = () => api.get("/api/labours").then((r) => r.data);
export const getLabour = (id) => api.get(`/api/labours/${id}`).then((r) => r.data);
export const createLabour = (payload) => api.post("/api/labours", payload).then((r) => r.data);
export const updateLabour = (id, payload) => api.put(`/api/labours/${id}`, payload).then((r) => r.data);
export const deactivateLabour = (id) => api.patch(`/api/labours/${id}/deactivate`).then((r) => r.data);
export const assignHodToLabour = (labourId, hodId) =>
  api.patch(`/api/hods/assign-labour/${labourId}`, { hodId }).then((r) => r.data);
export const uploadDocument = (labourId, file, documentType) => {
  const form = new FormData();
  form.append("file", file);
  form.append("documentType", documentType);
  return api
    .post(`/api/labours/${labourId}/documents`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};
