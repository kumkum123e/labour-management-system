const { sql, getPool } = require("../config/db");
const hodService = require("./hodService");

const { AppError } = require("../utils/AppError");

const findByName = async (departmentName, excludeId = null) => {
  const pool = getPool();
  const request = pool
    .request()
    .input("department_name", sql.VarChar, departmentName.trim());

  let query =
    "SELECT department_id, department_name FROM departments WHERE LOWER(department_name) = LOWER(@department_name) AND is_active = 1";

  if (excludeId) {
    request.input("department_id", sql.Int, excludeId);
    query += " AND department_id <> @department_id";
  }

  const result = await request.query(query);
  return result.recordset[0] || null;
};

const findOrCreateDepartment = async (departmentName, description = null) => {
  const existing = await findByName(departmentName);
  if (existing) {
    return {
      department_id: existing.department_id,
      department_name: existing.department_name,
      created: false,
    };
  }

  const pool = getPool();
  const result = await pool
    .request()
    .input("department_name", sql.VarChar, departmentName.trim())
    .input("description", sql.VarChar, description)
    .query(
      `INSERT INTO departments (department_name, description, is_active)
       OUTPUT INSERTED.department_id, INSERTED.department_name
       VALUES (@department_name, @description, 1)`
    );

  return { ...result.recordset[0], created: true };
};

const getAllDepartments = async () => {
  const pool = getPool();
  const result = await pool.request().query(
    `SELECT department_id, department_name
     FROM departments WHERE is_active = 1 ORDER BY department_name`
  );
  return result.recordset.map((row) => ({
    departmentID: row.department_id,
    departmentName: row.department_name,
  }));
};

const getDepartmentsAdminView = async () => {
  const pool = getPool();

  const depts = await pool.request().query(
    `SELECT d.department_id, d.department_name, d.description, d.primary_hod_id,
            ph.hod_name AS primary_hod_name,
            (SELECT COUNT(*) FROM labour_profiles lp
             WHERE lp.department_id = d.department_id) AS labour_count
     FROM departments d
     LEFT JOIN hod_profiles ph ON d.primary_hod_id = ph.hod_id
     WHERE d.is_active = 1
     ORDER BY d.department_name`
  );

  const hods = await pool.request().query(
    `SELECT h.hod_id, h.hod_name, h.department_id, h.mobile_number, u.username,
            (SELECT COUNT(*) FROM labour_profiles lp
             WHERE lp.assigned_hod_id = h.hod_id) AS labour_count
     FROM hod_profiles h
     LEFT JOIN users u ON h.user_id = u.user_id
     ORDER BY h.hod_name`
  );

  const hodsByDept = {};
  for (const h of hods.recordset) {
    if (!hodsByDept[h.department_id]) hodsByDept[h.department_id] = [];
    hodsByDept[h.department_id].push({
      hodID: h.hod_id,
      hodName: h.hod_name,
      mobileNumber: h.mobile_number,
      username: h.username,
      labourCount: h.labour_count,
    });
  }

  return depts.recordset.map((d) => ({
    departmentID: d.department_id,
    departmentName: d.department_name,
    description: d.description,
    primaryHodID: d.primary_hod_id,
    primaryHodName: d.primary_hod_name,
    labourCount: d.labour_count,
    hods: hodsByDept[d.department_id] || [],
  }));
};

const getDepartmentById = async (id) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("department_id", sql.Int, id)
    .query(
      `SELECT department_id, department_name, description, is_active
       FROM departments WHERE department_id = @department_id AND is_active = 1`
    );

  if (result.recordset.length === 0) {
    throw new AppError("Department not found", 404);
  }

  const row = result.recordset[0];
  return {
    departmentID: row.department_id,
    departmentName: row.department_name,
    description: row.description,
  };
};

const updateDepartment = async (id, departmentName, description) => {
  await getDepartmentById(id);
  const existing = await findByName(departmentName, id);
  if (existing) throw new AppError("Department name already exists", 409);

  await getPool()
    .request()
    .input("department_id", sql.Int, id)
    .input("department_name", sql.VarChar, departmentName.trim())
    .input("description", sql.VarChar, description ?? null)
    .query(
      `UPDATE departments SET department_name = @department_name, description = @description
       WHERE department_id = @department_id AND is_active = 1`
    );
};

const deleteDepartment = async (id) => {
  await getDepartmentById(id);
  await getPool()
    .request()
    .input("department_id", sql.Int, id)
    .query(`UPDATE departments SET is_active = 0 WHERE department_id = @department_id`);
};

const setPrimaryHod = async (departmentId, hodId) => {
  await getDepartmentById(departmentId);
  const hod = await hodService.getHodById(hodId);

  if (hod.departmentID !== departmentId) {
    throw new AppError("HOD must belong to this department", 400);
  }

  await getPool()
    .request()
    .input("department_id", sql.Int, departmentId)
    .input("primary_hod_id", sql.Int, hodId)
    .query(
      "UPDATE departments SET primary_hod_id = @primary_hod_id WHERE department_id = @department_id"
    );

  return { departmentId, primaryHodID: hodId, primaryHodName: hod.hodName };
};

module.exports = {
  AppError,
  findOrCreateDepartment,
  findByName,
  getAllDepartments,
  getDepartmentsAdminView,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  setPrimaryHod,
};
