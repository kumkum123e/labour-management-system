const dashboardService = require("../services/dashboardService");
const reportService = require("../services/reportService");
const { getRecentLogs } = require("../services/activityLogService");
const { isDbConnected } = require("../config/db");
const { AppError } = require("../services/departmentService");

const dbUnavailable = (res) =>
  res.status(503).json({ success: false, message: "Database not connected" });

const handleError = (res, error) => {
  if (error instanceof AppError || error.statusCode) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const adminDashboard = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await dashboardService.getAdminDashboard();
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const hodDashboard = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await dashboardService.getHodDashboard(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const labourDashboard = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await dashboardService.getLabourDashboard(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const monthlyReport = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const now = new Date();
    const year = parseInt(req.query.year, 10) || now.getFullYear();
    const month = parseInt(req.query.month, 10) || now.getMonth() + 1;
    const data = await reportService.getMonthlyReport(year, month);
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const departmentReport = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await reportService.getDepartmentReport(parseInt(req.params.id, 10));
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const dailyReport = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const data = await reportService.getDailyReport(date);
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const weeklyReport = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await reportService.getWeeklyReport();
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const labourReport = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const departmentId = req.query.departmentId
      ? parseInt(req.query.departmentId, 10)
      : null;
    const data = await reportService.getLabourReport(departmentId);
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const outingReport = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const now = new Date();
    const data = await reportService.getOutingReport({
      year: req.query.year ? parseInt(req.query.year, 10) : now.getFullYear(),
      month: req.query.month ? parseInt(req.query.month, 10) : null,
      status: req.query.status || null,
      departmentId: req.query.departmentId
        ? parseInt(req.query.departmentId, 10)
        : null,
    });
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

const activityLogs = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await getRecentLogs(parseInt(req.query.limit, 10) || 50);
    res.json({ success: true, data });
  } catch (e) {
    handleError(res, e);
  }
};

module.exports = {
  adminDashboard,
  hodDashboard,
  labourDashboard,
  monthlyReport,
  departmentReport,
  dailyReport,
  weeklyReport,
  labourReport,
  outingReport,
  activityLogs,
};
