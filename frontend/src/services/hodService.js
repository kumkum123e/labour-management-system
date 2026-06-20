import api from "./api";

export const getAllHods = () => api.get("/api/hods").then((r) => r.data);
export const updateHod = (id, payload) => api.patch(`/api/hods/${id}`, payload).then((r) => r.data);
