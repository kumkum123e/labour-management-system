require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const sql = require("mssql/msnodesqlv8");

const server = process.env.DB_SERVER || "localhost\\SQLEXPRESS";
const database = process.env.DB_DATABASE || "LabourManagementSystem";

const config = {
  connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${database};Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes`,
  driver: "msnodesqlv8",
};

(async () => {
  try {
    await sql.connect(config);
    const r = await sql.query("SELECT @@SERVERNAME AS srv, DB_NAME() AS db");
    console.log("ODBC connected:", r.recordset[0]);
    await sql.close();
    process.exit(0);
  } catch (e) {
    console.error("ODBC failed:", e.message);
    process.exit(1);
  }
})();
