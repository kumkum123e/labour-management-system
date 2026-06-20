require("dotenv").config();
const { connectDB, closeDB } = require("../config/db");
const { runBackup, listBackups } = require("../services/backupService");

(async () => {
  await connectDB();
  console.log("Running backup...");
  const entry = await runBackup();
  console.log("Created:", entry.fileName, "onDisk:", entry.onDisk);
  const list = await listBackups();
  console.log("Available:", list.filter((b) => b.onDisk).length, "of", list.length);
  await closeDB();
  process.exit(0);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
