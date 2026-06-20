const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  createOutingRequest,
  getOutingRequests,
  getOutingRequestById,
  approveOutingRequest,
  rejectOutingRequest,
  getAdminMonitor,
  urgentCallToLabour,
} = require("../controllers/outingController");
const {
  handleValidation,
  createOutingRules,
  requestIdParam,
  rejectRules,
  approveRules,
} = require("../validators/outingValidator");

const router = express.Router();

router.get("/admin/monitor", protect, authorize("ADMIN"), getAdminMonitor);

router.post(
  "/",
  protect,
  authorize("LABOUR"),
  createOutingRules,
  handleValidation,
  createOutingRequest
);

router.get(
  "/",
  protect,
  authorize("ADMIN", "HOD", "LABOUR"),
  getOutingRequests
);

router.get(
  "/:id",
  protect,
  authorize("ADMIN", "HOD", "LABOUR"),
  requestIdParam,
  handleValidation,
  getOutingRequestById
);

router.patch(
  "/:id/approve",
  protect,
  authorize("HOD", "ADMIN"),
  approveRules,
  handleValidation,
  approveOutingRequest
);

router.patch(
  "/:id/reject",
  protect,
  authorize("HOD", "ADMIN"),
  rejectRules,
  handleValidation,
  rejectOutingRequest
);

router.post(
  "/:id/urgent-call",
  protect,
  authorize("HOD", "ADMIN"),
  requestIdParam,
  handleValidation,
  urgentCallToLabour
);

module.exports = router;
