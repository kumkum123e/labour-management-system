require("dotenv").config();
const { connectDB, getPool } = require("./config/db");

(async () => {
  const ok = await connectDB();
  if (!ok) {
    console.error("Failed to connect");
    process.exit(1);
  }

  try {
    const pool = getPool();
    
    console.log("=== Users & Roles ===");
    const users = await pool.request().query(`
      SELECT u.user_id, u.username, r.role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
    `);
    console.table(users.recordset);

    console.log("=== HOD Profiles ===");
    const hods = await pool.request().query(`
      SELECT h.hod_id, h.hod_name, h.user_id, h.department_id, d.department_name
      FROM hod_profiles h
      LEFT JOIN departments d ON h.department_id = d.department_id
    `);
    console.table(hods.recordset);

    console.log("=== Labour Profiles ===");
    const labours = await pool.request().query(`
      SELECT l.labour_id, l.labour_name, l.employee_id, l.user_id, l.department_id, l.assigned_hod_id
      FROM labour_profiles l
    `);
    console.table(labours.recordset);

    console.log("=== Outing Requests ===");
    const requests = await pool.request().query(`
      SELECT r.request_id, r.labour_id, r.hod_id, r.status, r.is_urgent, r.created_at
      FROM outing_requests r
    `);
    console.table(requests.recordset);

  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
})();
