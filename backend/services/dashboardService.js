const { sql, getPool } = require("../config/db");
const hodService = require("./hodService");

const getAdminDashboard = async () => {
  const pool = getPool();
  const [depts, hods, labour, outings] = await Promise.all([
    pool.request().query("SELECT COUNT(*) AS c FROM departments WHERE is_active = 1"),
    pool.request().query("SELECT COUNT(*) AS c FROM hod_profiles"),
    pool.request().query("SELECT COUNT(*) AS c FROM labour_profiles WHERE status = 'Active'"),
    pool.request().query(
      `SELECT
         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
       FROM outing_requests`
    ),
  ]);

  return {
    totalDepartments: depts.recordset[0].c,
    totalHODs: hods.recordset[0].c,
    totalLabour: labour.recordset[0].c,
    pendingRequests: outings.recordset[0].pending || 0,
    approvedRequests: outings.recordset[0].approved || 0,
    rejectedRequests: outings.recordset[0].rejected || 0,
  };
};

const getHodDashboard = async (userId) => {
  const hod = await hodService.getHodByUserId(userId);
  if (!hod) {
    return {
      departmentName: null,
      departmentLabourCount: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
    };
  }

  const pool = getPool();
  const [labourCount, outings] = await Promise.all([
    pool
      .request()
      .input("department_id", sql.Int, hod.departmentID)
      .query(
        "SELECT COUNT(*) AS c FROM labour_profiles WHERE department_id = @department_id AND status = 'Active'"
      ),
    pool
      .request()
      .input("hod_id", sql.Int, hod.hodID)
      .query(
        `SELECT
           SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
         FROM outing_requests WHERE hod_id = @hod_id`
      ),
  ]);

  return {
    departmentName: hod.departmentName,
    departmentLabourCount: labourCount.recordset[0].c,
    pendingRequests: outings.recordset[0].pending || 0,
    approvedRequests: outings.recordset[0].approved || 0,
    rejectedRequests: outings.recordset[0].rejected || 0,
  };
};

const getLabourDashboard = async (userId) => {
  const pool = getPool();
  const labour = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .query("SELECT labour_id FROM labour_profiles WHERE user_id = @user_id");

  if (labour.recordset.length === 0) {
    return { myRequests: 0, pending: 0, approved: 0, rejected: 0 };
  }

  const result = await pool
    .request()
    .input("labour_id", sql.Int, labour.recordset[0].labour_id)
    .query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
       FROM outing_requests WHERE labour_id = @labour_id`
    );

  const row = result.recordset[0];
  return {
    myRequests: row.total || 0,
    pending: row.pending || 0,
    approved: row.approved || 0,
    rejected: row.rejected || 0,
  };
};

module.exports = { getAdminDashboard, getHodDashboard, getLabourDashboard };
