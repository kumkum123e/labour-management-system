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

const assignLabourHodRules = [
  param("labourId").isInt({ min: 1 }),
  body("hodId").isInt({ min: 1 }).withMessage("hodId is required"),
];

const primaryHodRules = [
  param("id").isInt({ min: 1 }),
  body("hodId").isInt({ min: 1 }).withMessage("hodId is required"),
];

const updateHodRules = [
  param("id").isInt({ min: 1 }),
  body("hodName").optional().trim().isLength({ min: 2, max: 100 }),
  body("mobileNumber").optional().trim().isLength({ max: 20 }),
];

module.exports = { handleValidation, assignLabourHodRules, primaryHodRules, updateHodRules };
