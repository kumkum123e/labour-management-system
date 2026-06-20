const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  createLabour,
  getAllLabours,
  getLabourById,
  updateLabour,
  deactivateLabour,
} = require("../controllers/labourController");
const { uploadDocument, listDocuments } = require("../controllers/uploadController");
const { upload } = require("../config/multer");
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
