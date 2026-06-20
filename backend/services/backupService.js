const path = require("path");
const fs = require("fs");
const { getPool, sql, closeDB, connectDB, connectMaster } = require("../config/db");
const { AppError } = require("./departmentService");

const LOCAL_BACKUP_DIR = path.join(__dirname, "..", "backups");
const SQL_BACKUP_DIR = path.join(LOCAL_BACKUP_DIR, "sql");
const MANIFEST_PATH = path.join(LOCAL_BACKUP_DIR, "manifest.json");
const EXCLUDED_PATH = path.join(LOCAL_BACKUP_DIR, "excluded.json");

const ensureLocalDir = () => {
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
  if (!fs.existsSync(SQL_BACKUP_DIR)) fs.mkdirSync(SQL_BACKUP_DIR, { recursive: true });
  return LOCAL_BACKUP_DIR;
};

const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toSqlPath = (filePath) => filePath.replace(/\//g, "\\");

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
};

const readManifest = () => {
  ensureLocalDir();
  return readJsonFile(MANIFEST_PATH);
};

const writeManifest = (entries) => {
  ensureLocalDir();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(entries, null, 2));
};

const readExcluded = () => {
  ensureLocalDir();
  return readJsonFile(EXCLUDED_PATH);
};

const writeExcluded = (fileNames) => {
  ensureLocalDir();
  fs.writeFileSync(EXCLUDED_PATH, JSON.stringify(fileNames, null, 2));
};

const getSqlBackupDirectory = async () => {
  if (process.env.SQL_BACKUP_PATH) {
    const dir = path.isAbsolute(process.env.SQL_BACKUP_PATH)
      ? process.env.SQL_BACKUP_PATH
      : path.resolve(__dirname, "..", process.env.SQL_BACKUP_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  ensureLocalDir();
  return SQL_BACKUP_DIR;
};

const isValidBackupName = (fileName) =>
  fileName && !fileName.includes("..") && fileName.endsWith(".bak");

const scanDiskBackups = async () => {
  const sqlDir = await getSqlBackupDirectory();
  const manifest = readManifest();
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith(".bak"));

  return files.map((fileName) => {
    const sqlPath = path.join(sqlDir, fileName);
    const stat = fs.statSync(sqlPath);
    const saved = manifest.find((e) => e.fileName === fileName);
    return {
      id: fileName,
      fileName,
      sqlPath: toSqlPath(sqlPath),
      size: formatSize(stat.size),
      sizeBytes: stat.size,
      createdAt: saved?.createdAt || stat.mtime.toISOString(),
      onDisk: true,
    };
  });
};

const getMissingEntries = () => {
  const excluded = new Set(readExcluded());
  return readManifest().filter(
    (e) => !excluded.has(e.fileName) && !fs.existsSync(e.sqlPath)
  );
};

const mergeBackupList = async () => {
  const onDisk = await scanDiskBackups();
  const onDiskNames = new Set(onDisk.map((e) => e.fileName));
  const missing = getMissingEntries().filter((e) => !onDiskNames.has(e.fileName));

  return [...onDisk, ...missing].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

const runBackup = async () => {
  const dbName = process.env.DB_DATABASE || "LabourManagementSystem";
  const sqlDir = await getSqlBackupDirectory();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${dbName}_${stamp}.bak`;
  const sqlPath = path.join(sqlDir, fileName);
  const sqlPathEscaped = toSqlPath(sqlPath).replace(/'/g, "''");

  await getPool()
    .request()
    .query(
      `BACKUP DATABASE [${dbName}] TO DISK = N'${sqlPathEscaped}' WITH FORMAT, INIT, NAME = N'${dbName} Backup'`
    );

  if (!fs.existsSync(sqlPath)) {
    throw new AppError(
      `Backup command ran but file was not created at ${sqlPath}. Grant the SQL Server service account write access to this folder.`,
      500
    );
  }

  const stat = fs.statSync(sqlPath);
  const entry = {
    id: fileName,
    fileName,
    sqlPath: toSqlPath(sqlPath),
    size: formatSize(stat.size),
    sizeBytes: stat.size,
    createdAt: new Date().toISOString(),
    onDisk: true,
  };

  const manifest = readManifest().filter((e) => e.fileName !== fileName);
  manifest.unshift(entry);
  writeManifest(manifest.slice(0, 50));

  return entry;
};

const listBackups = async () => mergeBackupList();

const resolveSqlPath = async (fileName) => {
  const sqlDir = await getSqlBackupDirectory();
  const localPath = path.join(sqlDir, fileName);
  if (fs.existsSync(localPath)) return toSqlPath(localPath);

  const manifestEntry = readManifest().find((e) => e.fileName === fileName);
  if (manifestEntry?.sqlPath && fs.existsSync(manifestEntry.sqlPath)) {
    return manifestEntry.sqlPath;
  }

  throw new AppError(
    `Backup file "${fileName}" is missing on disk. Run a new backup.`,
    404
  );
};

const removeBackup = async (fileName) => {
  if (!isValidBackupName(fileName)) {
    throw new AppError("Invalid backup file", 400);
  }

  const sqlDir = await getSqlBackupDirectory();
  const localPath = path.join(sqlDir, fileName);
  const manifest = readManifest();
  const entry = manifest.find((e) => e.fileName === fileName);
  const onDisk = fs.existsSync(localPath);

  if (onDisk) {
    fs.unlinkSync(localPath);
  } else if (!entry) {
    throw new AppError(`Backup "${fileName}" not found`, 404);
  }

  const excluded = readExcluded();
  if (!excluded.includes(fileName)) {
    writeExcluded([...excluded, fileName]);
  }

  writeManifest(manifest.filter((e) => e.fileName !== fileName));

  return { fileName, removed: true };
};

const restoreBackup = async (fileName) => {
  if (!isValidBackupName(fileName)) {
    throw new AppError("Invalid backup file", 400);
  }

  const sqlPath = await resolveSqlPath(fileName);
  const dbName = process.env.DB_DATABASE || "LabourManagementSystem";
  const escaped = toSqlPath(sqlPath).replace(/'/g, "''");

  await closeDB();

  let masterPool;
  let restoreError;
  try {
    masterPool = await connectMaster();
    await masterPool.request().query(
      `ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE`
    );
    await masterPool.request().query(
      `RESTORE DATABASE [${dbName}] FROM DISK = N'${escaped}' WITH REPLACE, RECOVERY`
    );
    await masterPool.request().query(
      `ALTER DATABASE [${dbName}] SET MULTI_USER`
    );
  } catch (err) {
    restoreError = err;
    if (masterPool) {
      try {
        await masterPool.request().query(
          `ALTER DATABASE [${dbName}] SET MULTI_USER`
        );
      } catch (_) {
        /* ignore */
      }
    }
  } finally {
    if (masterPool) {
      try {
        await masterPool.close();
      } catch (_) {
        /* ignore */
      }
    }
  }

  await connectDB();

  if (restoreError) {
    throw new AppError(restoreError.message || "Restore failed", 500);
  }

  return { fileName, restored: true };
};

module.exports = {
  runBackup,
  listBackups,
  restoreBackup,
  removeBackup,
  getSqlBackupDirectory,
  LOCAL_BACKUP_DIR,
  SQL_BACKUP_DIR,
};
