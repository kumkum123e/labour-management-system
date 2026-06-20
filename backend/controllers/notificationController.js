const {
  getUserNotifications,
  markAsRead,
} = require("../services/notificationService");
const { isDbConnected } = require("../config/db");

const getNotifications = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ success: false, message: "DB disconnected" });
  const unreadOnly = req.query.unread === "true";
  const data = await getUserNotifications(req.user.id, unreadOnly);
  res.json({ success: true, data });
};

const readNotification = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ success: false, message: "DB disconnected" });
  await markAsRead(parseInt(req.params.id, 10), req.user.id);
  res.json({ success: true, message: "Marked as read" });
};

module.exports = { getNotifications, readNotification };
