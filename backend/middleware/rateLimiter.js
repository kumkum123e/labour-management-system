const rateLimit = require("express-rate-limit");
const { getClientIp, isPrivateIp } = require("../utils/ipUtils");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isPrivateIp(getClientIp(req)),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many login attempts" },
  skip: (req) => isPrivateIp(getClientIp(req)),
});

module.exports = { apiLimiter, authLimiter };
