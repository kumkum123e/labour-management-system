import api from "./api";

export const listBackups = () => api.get("/api/backup").then((r) => r.data);
export const createBackup = () => api.post("/api/backup").then((r) => r.data);
export const restoreBackup = (fileName) =>
  api.post("/api/backup/restore", { fileName }).then((r) => r.data);
export const removeBackup = (fileName) =>
  api.post("/api/backup/remove", { fileName }).then((r) => r.data);
