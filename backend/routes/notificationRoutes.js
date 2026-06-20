const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getNotifications, readNotification } = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, readNotification);

module.exports = router;
