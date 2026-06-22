const express = require("express");
const { register, login, getUsersByRole, getSecurityByCode } = require("../controllers/authController");
const { getClientIp, isAdminIpAllowed } = require("../utils/ipUtils");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/network-status", (req, res) => {
  const clientIp = getClientIp(req);
  res.json({ success: true, isPrivate: isAdminIpAllowed(clientIp) });
});

router.get("/users/role/:roleName", protect, authorize("ADMIN"), getUsersByRole);
router.get("/security/code/:securityCode", protect, authorize("ADMIN", "HOD", "SECURITY"), getSecurityByCode);

module.exports = router;
