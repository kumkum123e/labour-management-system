const express = require("express");
const { register, login } = require("../controllers/authController");
const { isPrivateIp } = require("../utils/ipUtils");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/network-status", (req, res) => {
  const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  res.json({ success: true, isPrivate: isPrivateIp(clientIp) });
});

module.exports = router;
