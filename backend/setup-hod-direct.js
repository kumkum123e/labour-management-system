#!/usr/bin/env node
/**
 * Direct SQL setup for HOD profile
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const sql = require("mssql/msnodesqlv8");

async function setupHOD() {
  const server = process.env.DB_SERVER || "localhost\\SQLEXPRESS";
  const database = process.env.DB_DATABASE || "LabourManagementSystem";
  
  const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${database};Encrypt=yes;TrustServerCertificate=yes;Trusted_Connection=yes`;

  const config = {
    connectionString,
    driver: "msnodesqlv8",
  };

  let pool;
  try {
    console.log("Connecting to database...");
    pool = await sql.connect(config);
    console.log("✓ Connected to database\n");

    // Check if HOD profile already exists
    console.log("Step 1: Checking if HOD profile exists for user_id 20...");
    const checkResult = await pool.request()
      .input("user_id", sql.Int, 20)
      .query("SELECT hod_id FROM hod_profiles WHERE user_id = @user_id");

    let hodId;
    if (checkResult.recordset.length > 0) {
      hodId = checkResult.recordset[0].hod_id;
      console.log("✓ HOD profile already exists (hod_id: " + hodId + ")\n");
    } else {
      // Create HOD profile
      console.log("Creating HOD profile...");
      const createResult = await pool.request()
        .input("user_id", sql.Int, 20)
        .input("hod_name", sql.VarChar(100), "HOD User")
        .input("department_id", sql.Int, 6)
        .input("mobile_number", sql.VarChar(20), "9999999999")
        .query(`
          INSERT INTO hod_profiles (user_id, hod_name, department_id, mobile_number)
          OUTPUT INSERTED.hod_id
          VALUES (@user_id, @hod_name, @department_id, @mobile_number)
        `);

      hodId = createResult.recordset[0].hod_id;
      console.log("✓ HOD profile created (hod_id: " + hodId + ")\n");
    }

    // Now find labour "ravi" and assign to HOD
    console.log("Step 2: Finding labour ravi...");
    const labourResult = await pool.request()
      .input("username", sql.VarChar, "ravi")
      .query(`
        SELECT labour_id, department_id FROM labour_profiles
        WHERE user_id = (SELECT user_id FROM users WHERE username = @username)
      `);

    if (labourResult.recordset.length === 0) {
      console.warn("⚠ Labour with username 'ravi' not found");
    } else {
      const raviLabourId = labourResult.recordset[0].labour_id;
      const raviDepartmentId = labourResult.recordset[0].department_id;
      console.log("✓ Found labour ravi (labour_id: " + raviLabourId + ", department_id: " + raviDepartmentId + ")\n");

      // Check if they're in the same department
      if (raviDepartmentId !== 6) {
        console.warn("⚠ Labour is in department " + raviDepartmentId + ", but HOD is in department 6");
        console.log("   Updating labour's department to 6...");
        
        await pool.request()
          .input("labour_id", sql.Int, raviLabourId)
          .input("department_id", sql.Int, 6)
          .query("UPDATE labour_profiles SET department_id = @department_id WHERE labour_id = @labour_id");
        
        console.log("✓ Labour department updated\n");
      }

      // Assign labour to HOD
      console.log("Step 3: Assigning labour to HOD...");
      await pool.request()
        .input("labour_id", sql.Int, raviLabourId)
        .input("assigned_hod_id", sql.Int, hodId)
        .query("UPDATE labour_profiles SET assigned_hod_id = @assigned_hod_id WHERE labour_id = @labour_id");

      console.log("✓ Labour assigned to HOD\n");
    }

    console.log("✅ Setup complete!\n");
    console.log("Next steps:");
    console.log("1. Open frontend on http://localhost:3001");
    console.log("2. Log in as HOD: hod_user / hod123");
    console.log("3. Go to HOD Dashboard - you should see IT Department");
    console.log("4. Log out and log in as Labour: ravi / 123456");
    console.log("5. Create an Outing Request");
    console.log("6. Log out and log back as HOD - you should see Pending Requests\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

setupHOD();
