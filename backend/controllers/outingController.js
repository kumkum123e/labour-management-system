const outingService = require("../services/outingService");
const { AppError } = require("../services/departmentService");
const { isDbConnected } = require("../config/db");
const { logActivity, getClientIp } = require("../services/activityLogService");
const {
  createNotification,
  notifyHodUserId,
  notifyLabourUserId,
} = require("../services/notificationService");
const { callHodForUrgentRequest, callLabourForUrgent } = require("../services/phoneCallService");

const dbUnavailable = (res) =>
  res.status(503).json({ success: false, message: "Database not connected" });

const handleError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const createOutingRequest = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await outingService.createOutingRequest(req.body, req.user);
    await logActivity({
      userId: req.user.id,
      action: "Labour created outing request",
      entity: "outing_requests",
      entityId: data.requestID,
      ipAddress: getClientIp(req),
    });
    const hodUserId = await notifyHodUserId(data.hodID);
    const isUrgent = req.body.isUrgent === true || req.body.isUrgent === "true";
    if (hodUserId) {
      await createNotification({
        userId: hodUserId,
        title: isUrgent ? "URGENT: Outing Request" : "New Outing Request",
        message: isUrgent
          ? `${data.labourName} submitted an URGENT outing request for ${data.requestDate}. Phone alert sent.`
          : `${data.labourName} submitted an outing request for ${data.requestDate}`,
        type: isUrgent ? "urgent" : "outing",
      });
    }
    if (isUrgent) {
      await callHodForUrgentRequest(data.hodID, {
        labourName: data.labourName,
        requestDate: data.requestDate,
        reason: data.reason,
      });
    }
    res.status(201).json({ success: true, message: "Outing request created", data });
  } catch (error) {
    handleError(res, error);
  }
};

const getOutingRequests = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await outingService.getOutingRequests(req.user);
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const getOutingRequestById = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await outingService.assertCanView(
      req.user,
      parseInt(req.params.id, 10)
    );
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const approveOutingRequest = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await outingService.approveOutingRequest(
      parseInt(req.params.id, 10),
      req.user,
      req.body.remarks
    );
    await logActivity({
      userId: req.user.id,
      action: "HOD approved outing request",
      entity: "outing_requests",
      entityId: data.requestID,
      ipAddress: getClientIp(req),
    });
    const labourUserId = await notifyLabourUserId(data.labourID);
    if (labourUserId) {
      await createNotification({
        userId: labourUserId,
        title: "Outing Request Approved",
        message: `Your outing request for ${data.requestDate} was approved`,
        type: "outing",
      });
    }
    res.json({ success: true, message: "Outing request approved", data });
  } catch (error) {
    handleError(res, error);
  }
};

const rejectOutingRequest = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await outingService.rejectOutingRequest(
      parseInt(req.params.id, 10),
      req.user,
      req.body.remarks
    );
    await logActivity({
      userId: req.user.id,
      action: "HOD rejected outing request",
      entity: "outing_requests",
      entityId: data.requestID,
      ipAddress: getClientIp(req),
    });
    const labourUserId = await notifyLabourUserId(data.labourID);
    if (labourUserId) {
      await createNotification({
        userId: labourUserId,
        title: "Outing Request Rejected",
        message: `Your outing request was rejected. Remarks: ${data.remarks || "N/A"}`,
        type: "outing",
      });
    }
    res.json({ success: true, message: "Outing request rejected", data });
  } catch (error) {
    handleError(res, error);
  }
};

const getAdminMonitor = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await outingService.getAdminMonitor();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const urgentCallToLabour = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const requestId = parseInt(req.params.id, 10);
    const request = await outingService.assertCanView(req.user, requestId);
    
    // Get HOD details for message
    const hod = await outingService.getHodForRequest(request.hodID);
    
    // Make phone call to labour
    const callResult = await callLabourForUrgent(request.labourID, {
      hodName: hod.hodName,
      requestStatus: request.status,
      reason: req.body.reason || "",
    });

    await logActivity({
      userId: req.user.id,
      action: "HOD made urgent call to labour",
      entity: "outing_requests",
      entityId: requestId,
      ipAddress: getClientIp(req),
    });

    res.json({
      success: true,
      message: callResult.simulated 
        ? `[SIMULATED] Call to ${request.phone || "labour"}: ${callResult.message}`
        : "Urgent call initiated to labour",
      data: callResult,
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  createOutingRequest,
  getOutingRequests,
  getOutingRequestById,
  approveOutingRequest,
  rejectOutingRequest,
  getAdminMonitor,
  urgentCallToLabour,
};
