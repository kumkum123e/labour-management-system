const labourService = require("../services/labourService");
const { AppError } = require("../services/departmentService");
const { isDbConnected } = require("../config/db");
const { logActivity, getClientIp } = require("../services/activityLogService");

const dbUnavailable = (res) =>
  res.status(503).json({ success: false, message: "Database not connected" });

const handleError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const createLabour = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await labourService.createLabourProfile(req.body);
    await logActivity({
      userId: req.user.id,
      action: "Admin added labour",
      entity: "labour_profiles",
      entityId: data.labourID,
      ipAddress: getClientIp(req),
    });
    res.status(201).json({
      success: true,
      message: "Labour profile created",
      data,
    });
  } catch (error) {
    handleError(res, error);
  }
};

const getAllLabours = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await labourService.getAllLabourProfiles(req.user);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const getLabourById = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await labourService.assertAccess(
      req.user,
      parseInt(req.params.id, 10),
      "view"
    );
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const updateLabour = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const role = String(req.user.role).toUpperCase();
    if (role !== "ADMIN" && role !== "LABOUR") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const data = await labourService.updateLabourProfile(
      parseInt(req.params.id, 10),
      req.body,
      req.user
    );
    res.json({ success: true, message: "Labour profile updated", data });
  } catch (error) {
    handleError(res, error);
  }
};

const deactivateLabour = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await labourService.deactivateLabourProfile(
      parseInt(req.params.id, 10)
    );
    res.json({ success: true, message: "Labour profile deactivated", data });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createLabour,
  getAllLabours,
  getLabourById,
  updateLabour,
  deactivateLabour,
};
