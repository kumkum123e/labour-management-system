const sql = require("mssql/msnodesqlv8");

let pool = null;

const buildConfig = (databaseOverride) => {
  const server = process.env.DB_SERVER || "localhost\\SQLEXPRESS";
  const database = databaseOverride || process.env.DB_DATABASE || "LabourManagementSystem";
  const useSqlAuth = process.env.DB_USER && process.env.DB_PASSWORD;

  let connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${database};Encrypt=yes;TrustServerCertificate=yes`;

  if (useSqlAuth) {
    connectionString += `;UID=${process.env.DB_USER};PWD=${process.env.DB_PASSWORD}`;
  } else {
    connectionString += ";Trusted_Connection=yes";
  }

  return {
    connectionString,
    driver: "msnodesqlv8",
  };
};

const closeDB = async () => {
  if (pool) {
    try {
      await pool.close();
    } catch (_) {
      /* ignore */
    }
    pool = null;
  }
};

const connectDB = async () => {
  try {
    if (pool) await closeDB();
    pool = await sql.connect(buildConfig());
    console.log("Database Connected Successfully");
    console.log(`  Server: ${process.env.DB_SERVER}`);
    console.log(`  Database: ${process.env.DB_DATABASE}`);
    return true;
  } catch (error) {
    pool = null;
    console.error("Database Connection Failed");
    console.error(error.message);
    return false;
  }
};

const connectMaster = async () => sql.connect(buildConfig("master"));

const isDbConnected = () => pool !== null;

const getPool = () => pool;

module.exports = { connectDB, closeDB, connectMaster, sql, getPool, isDbConnected, buildConfig };
