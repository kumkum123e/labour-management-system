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

const createOutingRules = [
  body("requestDate").isISO8601().withMessage("Valid requestDate required"),
  body("outTime").trim().notEmpty().withMessage("outTime is required"),
  body("returnTime").optional().trim(),
  body("reason").trim().notEmpty().isLength({ max: 500 }),
  body("isUrgent").optional().isBoolean(),
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
