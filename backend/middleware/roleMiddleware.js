const ROLE_ALIASES = {
  admin: "ADMIN",
  manager: "HOD",
  employee: "LABOUR",
  hod: "HOD",
  labour: "LABOUR",
};

const normalizeRole = (role) => {
  if (!role) return "";
  const upper = String(role).toUpperCase();
  return ROLE_ALIASES[role.toLowerCase()] || upper;
};

const authorize = (...roles) => {
  const allowed = roles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const userRole = normalizeRole(req.user.role);

    if (userRole === "ADMIN") {
      const { isPrivateIp } = require("../utils/ipUtils");
      const clientIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      if (!isPrivateIp(clientIp)) {
        return res.status(403).json({
          message: "Admin operations are restricted to private network only",
        });
      }
      return next();
    }

    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not allowed to access this route`,
      });
    }

    next();
  };
};

module.exports = { authorize };
