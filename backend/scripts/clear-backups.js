const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { getSqlBackupDirectory } = require("../services/backupService");

(async () => {
  try {
    const backupDir = await getSqlBackupDirectory();
    console.log(`Clearing backups from: ${backupDir}`);
    
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        if (file.endsWith(".bak")) {
          fs.unlinkSync(path.join(backupDir, file));
          console.log(`Deleted: ${file}`);
        }
      }
    }

    const localBackupDir = path.join(__dirname, "..", "backups");
    const manifestPath = path.join(localBackupDir, "manifest.json");
    const excludedPath = path.join(localBackupDir, "excluded.json");

    if (fs.existsSync(manifestPath)) {
      fs.writeFileSync(manifestPath, "[]");
      console.log("Reset manifest.json");
    }
    if (fs.existsSync(excludedPath)) {
      fs.writeFileSync(excludedPath, "[]");
      console.log("Reset excluded.json");
    }

    console.log("Backup history successfully cleared!");
    process.exit(0);
  } catch (err) {
    console.error("Failed to clear backup history:", err);
    process.exit(1);
  }
})();
