const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../config/db");
const { AppError } = require("../utils/AppError");

const HOD_ROLE_ID = 2;

const mapHod = (row) => ({
  hodID: row.hod_id,
  hodName: row.hod_name,
  departmentID: row.department_id,
  departmentName: row.department_name,
  mobileNumber: row.mobile_number,
  username: row.username,
  labourCount: row.labour_count,
});

const getHodsByDepartment = async (departmentId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("department_id", sql.Int, departmentId)
    .query(
      `SELECT h.hod_id, h.hod_name, h.department_id, d.department_name, h.mobile_number, u.username,
              (SELECT COUNT(*) FROM labour_profiles lp
               WHERE lp.assigned_hod_id = h.hod_id) AS labour_count
       FROM hod_profiles h
       INNER JOIN departments d ON h.department_id = d.department_id
       LEFT JOIN users u ON h.user_id = u.user_id
       WHERE h.department_id = @department_id
       ORDER BY h.hod_name`
    );

  return result.recordset.map(mapHod);
};

const findHodInDepartment = async (hodName, departmentId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("hod_name", sql.VarChar, hodName.trim())
    .input("department_id", sql.Int, departmentId)
    .query(
      `SELECT hod_id, hod_name, department_id, user_id, mobile_number
       FROM hod_profiles
       WHERE LOWER(hod_name) = LOWER(@hod_name) AND department_id = @department_id`
    );
  return result.recordset[0] || null;
};

const findOrCreateHod = async (hodName, departmentId, mobileNumber = null) => {
  const existing = await findHodInDepartment(hodName, departmentId);
  if (existing) {
    return { hod_id: existing.hod_id, hod_name: existing.hod_name, created: false };
  }

  const pool = getPool();
  const baseUsername = hodName.trim().toLowerCase().replace(/\s+/g, "_");
  
  // Check if an HOD user already exists with this username
  const checkUser = await pool
    .request()
    .input("username", sql.VarChar, baseUsername)
    .query("SELECT user_id, role_id FROM users WHERE LOWER(username) = LOWER(@username)");

  let userId;
  if (checkUser.recordset.length > 0 && checkUser.recordset[0].role_id === HOD_ROLE_ID) {
    userId = checkUser.recordset[0].user_id;
  } else {
    // Generate unique username
    let username = baseUsername;
    let counter = 1;
    let userExists = true;

    while (userExists) {
      const checkUnique = await pool
        .request()
        .input("username", sql.VarChar, username)
        .query("SELECT user_id FROM users WHERE LOWER(username) = LOWER(@username)");
      if (checkUnique.recordset.length === 0) {
        userExists = false;
      } else {
        username = `${baseUsername}_${counter}`;
        counter++;
      }
    }

    const passwordHash = await bcrypt.hash("123456", 10);
    const userResult = await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("password_hash", sql.VarChar, passwordHash)
      .input("role_id", sql.Int, HOD_ROLE_ID)
      .query(
        `INSERT INTO users (username, password_hash, role_id, is_active)
         OUTPUT INSERTED.user_id
         VALUES (@username, @password_hash, @role_id, 1)`
      );
    userId = userResult.recordset[0].user_id;
  }

  const hodResult = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .input("hod_name", sql.VarChar, hodName.trim())
    .input("department_id", sql.Int, departmentId)
    .input("mobile_number", sql.VarChar, mobileNumber)
    .query(
      `INSERT INTO hod_profiles (user_id, hod_name, department_id, mobile_number)
       OUTPUT INSERTED.hod_id, INSERTED.hod_name
       VALUES (@user_id, @hod_name, @department_id, @mobile_number)`
    );

  return { ...hodResult.recordset[0], created: true };
};

const assignHodToDepartment = async (hodId, departmentId) => {
  const pool = getPool();

  const hod = await pool
    .request()
    .input("hod_id", sql.Int, hodId)
    .query("SELECT hod_id FROM hod_profiles WHERE hod_id = @hod_id");

  if (hod.recordset.length === 0) {
    throw new AppError("HOD not found", 404);
  }

  const dept = await pool
    .request()
    .input("department_id", sql.Int, departmentId)
    .query(
      "SELECT department_id FROM departments WHERE department_id = @department_id AND is_active = 1"
    );

  if (dept.recordset.length === 0) {
    throw new AppError("Department not found", 404);
  }

  await pool
    .request()
    .input("hod_id", sql.Int, hodId)
    .input("department_id", sql.Int, departmentId)
    .query(
      "UPDATE hod_profiles SET department_id = @department_id WHERE hod_id = @hod_id"
    );

  return true;
};

const createAndAssignHod = async (departmentId, hodName, mobileNumber) => {
  return findOrCreateHod(hodName, departmentId, mobileNumber);
};

const getHodById = async (hodId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("hod_id", sql.Int, hodId)
    .query(
      `SELECT h.hod_id, h.hod_name, h.department_id, d.department_name, h.mobile_number
       FROM hod_profiles h
       INNER JOIN departments d ON h.department_id = d.department_id
       WHERE h.hod_id = @hod_id`
    );

  if (result.recordset.length === 0) {
    throw new AppError("HOD not found", 404);
  }

  const row = result.recordset[0];
  return {
    hodID: row.hod_id,
    hodName: row.hod_name,
    departmentID: row.department_id,
    departmentName: row.department_name,
    mobileNumber: row.mobile_number,
  };
};

const getAllHods = async () => {
  const pool = getPool();
  const result = await pool.request().query(
    `SELECT h.hod_id, h.hod_name, h.department_id, d.department_name, h.mobile_number, u.username,
            (SELECT COUNT(*) FROM labour_profiles lp WHERE lp.assigned_hod_id = h.hod_id) AS labour_count
     FROM hod_profiles h
     INNER JOIN departments d ON h.department_id = d.department_id
     LEFT JOIN users u ON h.user_id = u.user_id
     ORDER BY d.department_name, h.hod_name`
  );
  return result.recordset.map(mapHod);
};

const getHodByUserId = async (userId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .query(
      `SELECT h.hod_id, h.hod_name, h.department_id, d.department_name, h.mobile_number
       FROM hod_profiles h
       INNER JOIN departments d ON h.department_id = d.department_id
       WHERE h.user_id = @user_id`
    );
  if (result.recordset.length === 0) return null;
  const row = result.recordset[0];
  return {
    hodID: row.hod_id,
    hodName: row.hod_name,
    departmentID: row.department_id,
    departmentName: row.department_name,
    mobileNumber: row.mobile_number,
  };
};

const assignLabourToHod = async (labourId, hodId) => {
  const hod = await getHodById(hodId);
  const pool = getPool();

  const labour = await pool
    .request()
    .input("labour_id", sql.Int, labourId)
    .query("SELECT labour_id, department_id FROM labour_profiles WHERE labour_id = @labour_id");

  if (labour.recordset.length === 0) {
    throw new AppError("Labour profile not found", 404);
  }

  if (labour.recordset[0].department_id !== hod.departmentID) {
    throw new AppError("HOD must belong to the same department as the labour", 400);
  }

  await pool
    .request()
    .input("labour_id", sql.Int, labourId)
    .input("assigned_hod_id", sql.Int, hodId)
    .query(
      "UPDATE labour_profiles SET assigned_hod_id = @assigned_hod_id WHERE labour_id = @labour_id"
    );

  return { labourId, hodID: hodId, hodName: hod.hodName };
};

const updateHodMobile = async (hodId, mobileNumber) => {
  if (!mobileNumber) return;
  await getHodById(hodId);
  await getPool()
    .request()
    .input("hod_id", sql.Int, hodId)
    .input("mobile_number", sql.VarChar, mobileNumber.trim())
    .query("UPDATE hod_profiles SET mobile_number = @mobile_number WHERE hod_id = @hod_id");
};

const updateHodProfile = async (hodId, { hodName, mobileNumber }) => {
  const hod = await getHodById(hodId);
  const pool = getPool();

  if (hodName && hodName.trim() !== hod.hodName) {
    const dup = await findHodInDepartment(hodName.trim(), hod.departmentID);
    if (dup && dup.hod_id !== hodId) {
      throw new AppError("Another HOD with this name exists in the department", 409);
    }
    await pool
      .request()
      .input("hod_id", sql.Int, hodId)
      .input("hod_name", sql.VarChar, hodName.trim())
      .query("UPDATE hod_profiles SET hod_name = @hod_name WHERE hod_id = @hod_id");
  }

  if (mobileNumber !== undefined && mobileNumber !== null) {
    await pool
      .request()
      .input("hod_id", sql.Int, hodId)
      .input("mobile_number", sql.VarChar, mobileNumber.trim() || null)
      .query("UPDATE hod_profiles SET mobile_number = @mobile_number WHERE hod_id = @hod_id");
  }

  const updated = await getHodById(hodId);
  const count = await pool
    .request()
    .input("hod_id", sql.Int, hodId)
    .query("SELECT COUNT(*) AS c FROM labour_profiles WHERE assigned_hod_id = @hod_id");
  return { ...updated, labourCount: count.recordset[0].c };
};

module.exports = {
  getHodsByDepartment,
  getAllHods,
  getHodById,
  getHodByUserId,
  findOrCreateHod,
  assignHodToDepartment,
  createAndAssignHod,
  findHodInDepartment,
  assignLabourToHod,
  updateHodMobile,
  updateHodProfile,
};
