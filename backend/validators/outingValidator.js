const { body, param, validationResult } = require("express-validator");

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const sanitizeTime = (value) => {
  if (!value) return value;
  return value.replace(/\./g, ":").trim();
};

const validateTimeFormat = (value) => {
  if (!value) return true;
  const timeRegex = /^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\s*(AM|PM))?$/i;
  if (!timeRegex.test(value)) {
    throw new Error("Invalid time format. Use HH:MM or HH:MM AM/PM (e.g. 02:30 PM or 14:30)");
  }
  return true;
};

const createOutingRules = [
  body("requestDate").isISO8601().withMessage("Valid requestDate required"),
  body("outTime")
    .trim()
    .notEmpty().withMessage("outTime is required")
    .customSanitizer(sanitizeTime)
    .custom(validateTimeFormat),
  body("returnTime")
    .optional()
    .trim()
    .customSanitizer(sanitizeTime)
    .custom(validateTimeFormat),
  body("reason").trim().notEmpty().isLength({ max: 500 }),
  body("isUrgent").optional().isBoolean(),
  body("employeeCode").optional().trim(),
  body("securitySignature").optional().trim(),
];

const requestIdParam = [param("id").isInt({ min: 1 })];

const rejectRules = [
  ...requestIdParam,
  body("remarks").trim().notEmpty().withMessage("Remarks required for rejection"),
];

const approveRules = [
  ...requestIdParam,
  body("remarks").optional().trim(),
];

module.exports = {
  handleValidation,
  createOutingRules,
  requestIdParam,
  rejectRules,
  approveRules,
};
