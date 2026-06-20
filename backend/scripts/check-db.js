require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDB, getPool, isDbConnected } = require("../config/db");

(async () => {
  const ok = await connectDB();
  if (!ok) {
    console.error("\nRun scripts/setup-sql-tcp.ps1 as Administrator, then update .env");
    process.exit(1);
  }

  try {
    const pool = getPool();
    const r = await pool.request().query("SELECT @@SERVERNAME AS server, DB_NAME() AS db");
    console.log("Connected:", r.recordset[0]);

    const t = await pool.request().query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'"
    );
    console.log("Users table exists:", t.recordset.length > 0);

    const count = await pool.request().query("SELECT COUNT(*) AS total FROM Users");
    console.log("Users count:", count.recordset[0].total);
  } catch (e) {
    console.error("Query failed:", e.message);
    process.exit(1);
  }
  process.exit(0);
})();
