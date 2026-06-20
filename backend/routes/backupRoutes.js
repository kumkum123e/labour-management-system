const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { createBackup, getBackups, restore, remove, backupInfo } = require("../controllers/backupController");

const router = express.Router();

router.get("/info", protect, authorize("ADMIN"), backupInfo);
router.get("/", protect, authorize("ADMIN"), getBackups);
router.post("/", protect, authorize("ADMIN"), createBackup);
router.post("/restore", protect, authorize("ADMIN"), restore);
router.post("/remove", protect, authorize("ADMIN"), remove);

module.exports = router;
