const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/protected", protect, (req, res) => {
  res.json({
    message: "Authentication successful — protected route accessed",
    user: req.user,
  });
});

router.get("/admin", protect, authorize("ADMIN"), (req, res) => {
  res.json({
    message: "Admin-only route accessed successfully",
    user: req.user,
  });
});

router.get("/hod", protect, authorize("ADMIN", "HOD"), (req, res) => {
  res.json({
    message: "HOD or Admin route accessed successfully",
    user: req.user,
  });
});

module.exports = router;
