const { sql, getPool } = require("../config/db");

const getMonthlyReport = async (year, month) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("year", sql.Int, year)
    .input("month", sql.Int, month)
    .query(
      `SELECT
         COUNT(*) AS totalOutings,
         SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending
       FROM outing_requests
       WHERE YEAR(created_at) = @year AND MONTH(created_at) = @month`
    );

  const labour = await pool
    .request()
    .input("year", sql.Int, year)
    .input("month", sql.Int, month)
    .query(
      `SELECT COUNT(*) AS newLabour FROM labour_profiles
       WHERE YEAR(created_at) = @year AND MONTH(created_at) = @month`
    );

  return {
    period: { year, month },
    outings: result.recordset[0],
    newLabour: labour.recordset[0].newLabour,
  };
};

const getDepartmentReport = async (departmentId) => {
  const pool = getPool();
  const dept = await pool
    .request()
    .input("department_id", sql.Int, departmentId)
    .query(
      "SELECT department_id, department_name FROM departments WHERE department_id = @department_id"
    );

  if (dept.recordset.length === 0) {
    const err = new Error("Department not found");
    err.statusCode = 404;
    throw err;
  }

  const [labour, hods, outings] = await Promise.all([
    pool
      .request()
      .input("department_id", sql.Int, departmentId)
      .query(
        "SELECT COUNT(*) AS c FROM labour_profiles WHERE department_id = @department_id"
      ),
    pool
      .request()
      .input("department_id", sql.Int, departmentId)
      .query(
        "SELECT COUNT(*) AS c FROM hod_profiles WHERE department_id = @department_id"
      ),
    pool
      .request()
      .input("department_id", sql.Int, departmentId)
      .query(
        `SELECT r.status, COUNT(*) AS count
         FROM outing_requests r
         INNER JOIN labour_profiles lp ON r.labour_id = lp.labour_id
         WHERE lp.department_id = @department_id
         GROUP BY r.status`
      ),
  ]);

  const outingSummary = { Pending: 0, Approved: 0, Rejected: 0 };
  for (const row of outings.recordset) {
    outingSummary[row.status] = row.count;
  }

  return {
    departmentID: departmentId,
    departmentName: dept.recordset[0].department_name,
    totalLabour: labour.recordset[0].c,
    totalHODs: hods.recordset[0].c,
    outingSummary,
  };
};

const getDailyReport = async (date) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("date", sql.Date, date)
    .query(
      `SELECT status, COUNT(*) AS count FROM outing_requests
       WHERE CAST(created_at AS DATE) = @date GROUP BY status`
    );
  return { date, outings: result.recordset };
};

const getWeeklyReport = async () => {
  const pool = getPool();
  const result = await pool.request().query(
    `SELECT CAST(created_at AS DATE) AS day, COUNT(*) AS count
     FROM outing_requests
     WHERE created_at >= DATEADD(day, -7, GETDATE())
     GROUP BY CAST(created_at AS DATE)
     ORDER BY day`
  );
  return { last7Days: result.recordset };
};

const getLabourReport = async (departmentId) => {
  const pool = getPool();
  let query = `
    SELECT lp.labour_id, lp.employee_id, lp.labour_name, lp.contractor_name,
           lp.mobile_number, lp.address, lp.joining_date, lp.status,
           ISNULL(lp.photo_url, '') AS photo_url,
           d.department_name, h.hod_name
    FROM labour_profiles lp
    LEFT JOIN departments d ON lp.department_id = d.department_id
    LEFT JOIN hod_profiles h ON lp.assigned_hod_id = h.hod_id
  `;
  const request = pool.request();
  if (departmentId) {
    query += " WHERE lp.department_id = @department_id";
    request.input("department_id", sql.Int, departmentId);
  }
  query += " ORDER BY lp.labour_name";

  let result;
  try {
    result = await request.query(query);
  } catch (err) {
    if (!String(err.message).includes("photo_url")) throw err;
    query = query.replace("ISNULL(lp.photo_url, '') AS photo_url,", "");
    result = await request.query(query);
  }

  return result.recordset.map((r) => ({
    labourID: r.labour_id,
    employeeCode: r.employee_id,
    labourName: r.labour_name,
    contractorName: r.contractor_name,
    phone: r.mobile_number,
    address: r.address,
    joiningDate: r.joining_date,
    status: r.status,
    photoUrl: r.photo_url || null,
    departmentName: r.department_name,
    hodName: r.hod_name,
  }));
};

const getOutingReport = async (filters = {}) => {
  const pool = getPool();
  const { year, month, status, departmentId } = filters;
  let query = `
    SELECT r.request_id, r.request_date, r.out_time, r.return_time, r.reason, r.status,
           lp.labour_name, lp.employee_id, d.department_name, h.hod_name
    FROM outing_requests r
    INNER JOIN labour_profiles lp ON r.labour_id = lp.labour_id
    INNER JOIN departments d ON lp.department_id = d.department_id
    INNER JOIN hod_profiles h ON r.hod_id = h.hod_id
    WHERE 1=1
  `;
  const request = pool.request();
  if (year) {
    query += " AND YEAR(r.created_at) = @year";
    request.input("year", sql.Int, year);
  }
  if (month) {
    query += " AND MONTH(r.created_at) = @month";
    request.input("month", sql.Int, month);
  }
  if (status) {
    query += " AND r.status = @status";
    request.input("status", sql.VarChar, status);
  }
  if (departmentId) {
    query += " AND lp.department_id = @department_id";
    request.input("department_id", sql.Int, departmentId);
  }
  query += " ORDER BY r.created_at DESC";

  const result = await request.query(query);
  return result.recordset.map((r) => ({
    requestID: r.request_id,
    requestDate: r.request_date,
    outTime: r.out_time,
    returnTime: r.return_time,
    reason: r.reason,
    status: r.status,
    labourName: r.labour_name,
    employeeCode: r.employee_id,
    departmentName: r.department_name,
    hodName: r.hod_name,
  }));
};

module.exports = {
  getMonthlyReport,
  getDepartmentReport,
  getDailyReport,
  getWeeklyReport,
  getLabourReport,
  getOutingReport,
};
