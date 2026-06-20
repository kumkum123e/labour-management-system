import api from "./api";

export const getMonthlyReport = (year, month) =>
  api.get("/api/reports/monthly", { params: { year, month } }).then((r) => r.data);
export const getDailyReport = (date) =>
  api.get("/api/reports/daily", { params: { date } }).then((r) => r.data);
export const getWeeklyReport = () => api.get("/api/reports/weekly").then((r) => r.data);
export const getDepartmentReport = (id) =>
  api.get(`/api/reports/department/${id}`).then((r) => r.data);
export const getLabourReport = (departmentId) =>
  api
    .get("/api/reports/labour", {
      params: departmentId ? { departmentId } : {},
    })
    .then((r) => r.data);
export const getOutingReport = (params) =>
  api.get("/api/reports/outing", { params }).then((r) => r.data);
export const getActivityLogs = (limit = 50) =>
  api.get("/api/reports/activity-logs", { params: { limit } }).then((r) => r.data);
