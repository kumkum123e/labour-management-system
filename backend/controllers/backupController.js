const { runBackup, listBackups, restoreBackup, removeBackup } = require("../services/backupService");
const { logActivity, getClientIp } = require("../services/activityLogService");
const { AppError } = require("../services/departmentService");
const { isDbConnected } = require("../config/db");

const dbUnavailable = (res) =>
  res.status(503).json({ success: false, message: "Database not connected" });

const createBackup = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await runBackup();
    await logActivity({
      userId: req.user.id,
      action: "Admin created database backup",
      entity: "backups",
      entityId: null,
      ipAddress: getClientIp(req),
    });
    res.status(201).json({ success: true, message: "Backup created successfully", data });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || "Backup failed. Ensure SQL Server can write to backend/backups folder.",
    });
  }
};

const getBackups = async (req, res) => {
  try {
    const data = await listBackups();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const backupInfo = async (req, res) => {
  try {
    const { getSqlBackupDirectory } = require("../services/backupService");
    const backupDirectory = await getSqlBackupDirectory();
    res.json({ success: true, data: { backupDirectory } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const data = await removeBackup(req.body.fileName);
    await logActivity({
      userId: req.user.id,
      action: `Admin removed backup ${req.body.fileName}`,
      entity: "backups",
      entityId: null,
      ipAddress: getClientIp(req),
    });
    res.json({ success: true, message: "Backup removed from history", data });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

const restore = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await restoreBackup(req.body.fileName);
    await logActivity({
      userId: req.user.id,
      action: `Admin restored backup ${req.body.fileName}`,
      entity: "backups",
      entityId: null,
      ipAddress: getClientIp(req),
    });
    res.json({ success: true, message: "Database restored", data });
  } catch (err) {
    if (err instanceof AppError) return res.status(err.statusCode).json({ success: false, message: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { createBackup, getBackups, restore, remove, backupInfo };
