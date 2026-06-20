const hodService = require("../services/hodService");
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

const getAllHods = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await hodService.getAllHods();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const assignLabourToHod = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const { hodId } = req.body;
    const data = await hodService.assignLabourToHod(
      parseInt(req.params.labourId, 10),
      parseInt(hodId, 10)
    );
    await logActivity({
      userId: req.user.id,
      action: "Admin assigned HOD to labour",
      entity: "labour_profiles",
      entityId: parseInt(req.params.labourId, 10),
      ipAddress: getClientIp(req),
    });
    res.json({ success: true, message: "HOD assigned to labour", data });
  } catch (error) {
    handleError(res, error);
  }
};

const updateHod = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await hodService.updateHodProfile(parseInt(req.params.id, 10), {
      hodName: req.body.hodName,
      mobileNumber: req.body.mobileNumber,
    });
    await logActivity({
      userId: req.user.id,
      action: "Admin updated HOD profile",
      entity: "hod_profiles",
      entityId: parseInt(req.params.id, 10),
      ipAddress: getClientIp(req),
    });
    res.json({ success: true, message: "HOD updated", data });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = { getAllHods, assignLabourToHod, updateHod };
