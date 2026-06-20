const rateLimit = require("express-rate-limit");
const { isPrivateIp } = require("../utils/ipUtils");

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isPrivateIp(req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many login attempts" },
  skip: (req) => isPrivateIp(req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress),
});

module.exports = { apiLimiter, authLimiter };
