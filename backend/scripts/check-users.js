require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDB, getPool } = require("../config/db");

(async () => {
  const ok = await connectDB();
  if (!ok) {
    console.error("Failed to connect");
    process.exit(1);
  }

  try {
    const pool = getPool();
    
    const hod = await pool.request().query("SELECT * FROM hod_profiles");
    console.log("HOD Profiles Records:");
    console.log(hod.recordset);

    const labour = await pool.request().query("SELECT TOP 5 * FROM labour_profiles");
    console.log("Labour Profiles Records (top 5):");
    console.log(labour.recordset);
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
})();
