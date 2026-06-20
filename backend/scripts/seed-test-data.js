require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const { connectDB, getPool, sql } = require("../config/db");

(async () => {
  console.log("Connecting to database for seeding test data...");
  const ok = await connectDB();
  if (!ok) {
    console.error("Failed to connect to the database.");
    process.exit(1);
  }

  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();
    console.log("Transaction started.");

    // 1. Ensure Roles table has standard records
    console.log("Seeding roles if missing...");
    await transaction.request().query(`
      IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 1) INSERT INTO roles (role_id, role_name) VALUES (1, 'ADMIN');
      IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 2) INSERT INTO roles (role_id, role_name) VALUES (2, 'HOD');
      IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 3) INSERT INTO roles (role_id, role_name) VALUES (3, 'LABOUR');
    `);

    // 2. Clear out any existing profiles and users to prevent identity insertions conflicts
    console.log("Cleaning conflict records...");
    await transaction.request().query(`
      DELETE FROM activity_logs;
      DELETE FROM login_logs;
      DELETE FROM backups;
      DELETE FROM notifications;
      DELETE FROM request_approvals;
      DELETE FROM outing_requests;
      DELETE FROM labour_documents;
      DELETE FROM labour_profiles;
      DELETE FROM hod_profiles;
      UPDATE departments SET primary_hod_id = NULL;
      DELETE FROM departments;
      DELETE FROM users;
    `);

    const passwordHash = await bcrypt.hash("123456", 10);
    const adminPasswordHash = await bcrypt.hash("admin123", 10);

    // 3. Seed users
    console.log("Seeding test users...");
    await transaction.request()
      .input("p_admin", sql.VarChar, adminPasswordHash)
      .input("p_test", sql.VarChar, passwordHash)
      .query(`
        SET IDENTITY_INSERT users ON;
        INSERT INTO users (user_id, username, password_hash, role_id, is_active) VALUES 
        (1, 'admin_dept_1780479568776', @p_admin, 1, 1),
        (2, 'rajesh', @p_test, 2, 1),
        (3, 'ravi', @p_test, 3, 1),
        (19, 'admin', @p_admin, 1, 1);
        SET IDENTITY_INSERT users OFF;
      `);

    // 4. Seed Departments
    console.log("Seeding test department...");
    await transaction.request().query(`
      SET IDENTITY_INSERT departments ON;
      INSERT INTO departments (department_id, department_name, description, is_active) VALUES 
      (1, 'IT', 'Information Technology Department', 1);
      SET IDENTITY_INSERT departments OFF;
    `);

    // 5. Seed HOD Profile
    console.log("Seeding HOD profile...");
    await transaction.request().query(`
      SET IDENTITY_INSERT hod_profiles ON;
      INSERT INTO hod_profiles (hod_id, user_id, department_id, hod_name, mobile_number) VALUES 
      (1, 2, 1, 'Rajesh', '9876543210');
      SET IDENTITY_INSERT hod_profiles OFF;
      
      UPDATE departments SET primary_hod_id = 1 WHERE department_id = 1;
    `);

    // 6. Seed Labour Profile
    console.log("Seeding Labour profile...");
    await transaction.request().query(`
      SET IDENTITY_INSERT labour_profiles ON;
      INSERT INTO labour_profiles (labour_id, user_id, department_id, assigned_hod_id, employee_id, labour_name, mobile_number, status) VALUES 
      (2, 3, 1, 1, 'ravi', 'Ravi Kumar', '9876543211', 'Active');
      SET IDENTITY_INSERT labour_profiles OFF;
    `);

    await transaction.commit();
    console.log("Test database seeded successfully!");
  } catch (error) {
    console.error("Seeding failed, rolling back...");
    console.error(error.message);
    try {
      await transaction.rollback();
    } catch (_) {}
    process.exit(1);
  }
  process.exit(0);
})();
