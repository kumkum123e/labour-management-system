require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDB, getPool, sql } = require("../config/db");

(async () => {
  await connectDB();
  const db = process.env.DB_DATABASE || "LabourManagementSystem";
  const p =
    "C:\\Program Files\\Microsoft SQL Server\\MSSQL17.SQLEXPRESS\\MSSQL\\Backup\\" +
    db +
    "_test.bak";
  await getPool()
    .request()
    .query(`BACKUP DATABASE [${db}] TO DISK = N'${p.replace(/'/g, "''")}' WITH FORMAT, INIT`);
  console.log("backup ok");
  const r = await getPool()
    .request()
    .input("db", sql.NVarChar, db)
    .query(
      `SELECT TOP 1 bmf.physical_device_name, bs.backup_size, bs.backup_start_date
       FROM msdb.dbo.backupset bs
       INNER JOIN msdb.dbo.backupmediafamily bmf ON bs.media_set_id = bmf.media_set_id
       WHERE bs.database_name = @db
       ORDER BY bs.backup_start_date DESC`
    );
  console.log(r.recordset[0]);
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
