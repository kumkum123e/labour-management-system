const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  monthlyReport,
  departmentReport,
  dailyReport,
  weeklyReport,
  labourReport,
  outingReport,
  activityLogs,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/monthly", protect, authorize("ADMIN"), monthlyReport);
router.get("/daily", protect, authorize("ADMIN"), dailyReport);
router.get("/weekly", protect, authorize("ADMIN"), weeklyReport);
router.get("/labour", protect, authorize("ADMIN"), labourReport);
router.get("/outing", protect, authorize("ADMIN"), outingReport);
router.get("/department/:id", protect, authorize("ADMIN", "HOD"), departmentReport);
router.get("/activity-logs", protect, authorize("ADMIN"), activityLogs);

module.exports = router;
