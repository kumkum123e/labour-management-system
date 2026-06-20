const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  adminDashboard,
  hodDashboard,
  labourDashboard,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/admin", protect, authorize("ADMIN"), adminDashboard);
router.get("/hod", protect, authorize("HOD"), hodDashboard);
router.get("/labour", protect, authorize("LABOUR"), labourDashboard);

module.exports = router;
