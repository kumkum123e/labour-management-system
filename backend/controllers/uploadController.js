const uploadService = require("../services/uploadService");
const { logActivity, getClientIp } = require("../services/activityLogService");
const { AppError } = require("../services/departmentService");
const { isDbConnected } = require("../config/db");

const uploadDocument = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ success: false, message: "DB disconnected" });
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const documentType = req.body.documentType || "document";
    const data = await uploadService.saveLabourDocument(
      parseInt(req.params.id, 10),
      documentType,
      req.file,
      req.user.id
    );
    await logActivity({
      userId: req.user.id,
      action: `Uploaded ${documentType} for labour`,
      entity: "labour_documents",
      entityId: data.documentID,
      ipAddress: getClientIp(req),
    });
    res.status(201).json({ success: true, message: "File uploaded", data });
  } catch (e) {
    if (e instanceof AppError) return res.status(e.statusCode).json({ success: false, message: e.message });
    res.status(500).json({ success: false, message: e.message });
  }
};

const listDocuments = async (req, res) => {
  if (!isDbConnected()) return res.status(503).json({ success: false, message: "DB disconnected" });
  const data = await uploadService.getLabourDocuments(parseInt(req.params.id, 10));
  res.json({ success: true, data });
};

module.exports = { uploadDocument, listDocuments };
