const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  createLabour,
  getAllLabours,
  getLabourById,
  getLabourByCode,
  updateLabour,
  deactivateLabour,
  bulkCreateLabours,
  bulkUploadPhotos,
} = require("../controllers/labourController");
const { uploadDocument, listDocuments } = require("../controllers/uploadController");
const { upload, uploadZip } = require("../config/multer");
const {
  handleValidation,
  labourIdParam,
  createLabourRules,
  updateLabourRules,
} = require("../validators/labourValidator");

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("ADMIN"),
  createLabourRules,
  handleValidation,
  createLabour
);

router.post(
  "/bulk",
  protect,
  authorize("ADMIN"),
  bulkCreateLabours
);

router.post(
  "/bulk-photos",
  protect,
  authorize("ADMIN"),
  uploadZip.single("zipFile"),
  bulkUploadPhotos
);

router.get("/", protect, authorize("ADMIN", "HOD", "LABOUR"), getAllLabours);

router.post(
  "/:id/documents",
  protect,
  authorize("ADMIN", "LABOUR"),
  labourIdParam,
  handleValidation,
  upload.single("file"),
  uploadDocument
);

router.get(
  "/:id/documents",
  protect,
  authorize("ADMIN", "HOD", "LABOUR"),
  labourIdParam,
  handleValidation,
  listDocuments
);

router.get(
  "/code/:employeeCode",
  protect,
  authorize("ADMIN", "HOD", "SECURITY"),
  getLabourByCode
);

router.get(
  "/:id",
  protect,
  authorize("ADMIN", "HOD", "LABOUR"),
  labourIdParam,
  handleValidation,
  getLabourById
);

router.put(
  "/:id",
  protect,
  authorize("ADMIN", "LABOUR"),
  updateLabourRules,
  handleValidation,
  updateLabour
);

router.patch(
  "/:id/deactivate",
  protect,
  authorize("ADMIN"),
  labourIdParam,
  handleValidation,
  deactivateLabour
);

module.exports = router;
