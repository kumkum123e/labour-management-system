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
    const usersCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
    `);
    console.log("Users Table Columns:");
    console.table(usersCols.recordset);

    const labourCols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'labour_profiles'
    `);
    console.log("Labour Profiles Table Columns:");
    console.table(labourCols.recordset);
  } catch (e) {
    console.error(e.message);
  }
  process.exit(0);
})();
