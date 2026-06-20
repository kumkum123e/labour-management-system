require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDB, getPool } = require("../config/db");

(async () => {
  await connectDB();
  const r = await getPool()
    .request()
    .query(
      "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS NVARCHAR(4000)) AS backup_path"
    );
  console.log(JSON.stringify(r.recordset[0], null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
