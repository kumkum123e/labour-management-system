const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  approveOutingRequest,
  rejectOutingRequest,
} = require("../controllers/outingController");
const {
  handleValidation,
  requestIdParam,
  rejectRules,
  approveRules,
} = require("../validators/outingValidator");

const router = express.Router();

router.put(
  "/:id/approve",
  protect,
  authorize("HOD", "ADMIN"),
  approveRules,
  handleValidation,
  approveOutingRequest
);

router.put(
  "/:id/reject",
  protect,
  authorize("HOD", "ADMIN"),
  rejectRules,
  handleValidation,
  rejectOutingRequest
);

module.exports = router;
