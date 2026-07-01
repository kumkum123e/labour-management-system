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
  const pool = getPool();
  const profilesResult = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .query(
      `SELECT h.hod_id, h.department_id, d.department_name
       FROM hod_profiles h
       INNER JOIN departments d ON h.department_id = d.department_id
       WHERE h.user_id = @user_id`
    );

  if (profilesResult.recordset.length === 0) {
    return {
      departmentName: null,
      departmentLabourCount: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
    };
  }

  const departmentNames = profilesResult.recordset.map(r => r.department_name).join(", ");
  
  const [labourCountRes, outingsRes] = await Promise.all([
    pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(
        `SELECT COUNT(*) AS c 
         FROM labour_profiles 
         WHERE department_id IN (SELECT department_id FROM hod_profiles WHERE user_id = @user_id) 
           AND status = 'Active'`
      ),
    pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(
        `SELECT
           SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
           SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
         FROM outing_requests 
         WHERE hod_id IN (SELECT hod_id FROM hod_profiles WHERE user_id = @user_id)`
      ),
  ]);

  return {
    departmentName: departmentNames,
    departmentLabourCount: labourCountRes.recordset[0].c || 0,
    pendingRequests: outingsRes.recordset[0].pending || 0,
    approvedRequests: outingsRes.recordset[0].approved || 0,
    rejectedRequests: outingsRes.recordset[0].rejected || 0,
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
