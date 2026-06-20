import api from "./api";

export const getNotifications = (unreadOnly = false) =>
  api.get("/api/notifications", { params: unreadOnly ? { unread: "true" } : {} }).then((r) => r.data);
export const markNotificationRead = (id) =>
  api.patch(`/api/notifications/${id}/read`).then((r) => r.data);
