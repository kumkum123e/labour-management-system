const { sql, getPool } = require("../config/db");

const createNotification = async ({ userId, title, message, type = "info" }) => {
  try {
    await getPool()
      .request()
      .input("user_id", sql.Int, userId)
      .input("title", sql.VarChar, title)
      .input("message", sql.NVarChar(sql.MAX), message)
      .input("notification_type", sql.VarChar, type)
      .query(
        `INSERT INTO notifications (user_id, title, message, notification_type, is_read)
         VALUES (@user_id, @title, @message, @notification_type, 0)`
      );
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
};

const getUserNotifications = async (userId, unreadOnly = false) => {
  const pool = getPool();
  let query = `SELECT notification_id, title, message, notification_type, is_read, created_at
               FROM notifications WHERE user_id = @user_id`;
  if (unreadOnly) query += " AND is_read = 0";
  query += " ORDER BY created_at DESC";

  const result = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .query(query);

  return result.recordset.map((r) => ({
    notificationID: r.notification_id,
    title: r.title,
    message: r.message,
    type: r.notification_type,
    isRead: r.is_read === true || r.is_read === 1,
    createdAt: r.created_at,
  }));
};

const markAsRead = async (notificationId, userId) => {
  await getPool()
    .request()
    .input("notification_id", sql.Int, notificationId)
    .input("user_id", sql.Int, userId)
    .query(
      `UPDATE notifications SET is_read = 1
       WHERE notification_id = @notification_id AND user_id = @user_id`
    );
};

const notifyHodUserId = async (hodId) => {
  const result = await getPool()
    .request()
    .input("hod_id", sql.Int, hodId)
    .query("SELECT user_id FROM hod_profiles WHERE hod_id = @hod_id");
  return result.recordset[0]?.user_id || null;
};

const notifyLabourUserId = async (labourId, securityId = null) => {
  const pool = getPool();
  if (labourId) {
    const result = await pool
      .request()
      .input("labour_id", sql.Int, labourId)
      .query("SELECT user_id FROM labour_profiles WHERE labour_id = @labour_id");
    return result.recordset[0]?.user_id || null;
  }
  if (securityId) {
    const result = await pool
      .request()
      .input("security_id", sql.Int, securityId)
      .query("SELECT user_id FROM security_profiles WHERE security_id = @security_id");
    return result.recordset[0]?.user_id || null;
  }
  return null;
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  notifyHodUserId,
  notifyLabourUserId,
};
