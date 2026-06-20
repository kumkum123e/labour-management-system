const { sql, getPool } = require("../config/db");

const logActivity = async ({ userId, action, entity, entityId, ipAddress }) => {
  try {
    await getPool()
      .request()
      .input("user_id", sql.Int, userId || null)
      .input("action", sql.VarChar, action)
      .input("table_name", sql.VarChar, entity)
      .input("record_id", sql.Int, entityId || null)
      .input("ip_address", sql.VarChar, ipAddress || null)
      .query(
        `INSERT INTO activity_logs (user_id, action, table_name, record_id, action_time, ip_address)
         VALUES (@user_id, @action, @table_name, @record_id, GETDATE(), @ip_address)`
      );
  } catch (err) {
    console.error("Activity log failed:", err.message);
  }
};

const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.ip ||
  req.socket?.remoteAddress ||
  null;

const getRecentLogs = async (limit = 50) => {
  const result = await getPool()
    .request()
    .input("limit", sql.Int, limit)
    .query(
      `SELECT TOP (@limit) al.log_id, al.user_id, u.username, al.action, al.table_name AS entity,
              al.record_id AS entity_id, al.ip_address, al.action_time AS created_at
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.user_id
       ORDER BY al.action_time DESC`
    );
  return result.recordset.map((r) => ({
    logID: r.log_id,
    userID: r.user_id,
    username: r.username,
    action: r.action,
    entity: r.entity,
    entityID: r.entity_id,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
  }));
};

module.exports = { logActivity, getClientIp, getRecentLogs };
