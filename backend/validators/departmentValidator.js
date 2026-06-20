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

const departmentIdParam = [
  param("id").isInt({ min: 1 }).withMessage("Valid department ID required"),
];

const inlineDepartmentRules = [
  body("departmentName")
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 100 })
    .withMessage("Department name is required and must be at least 3 characters"),
  body("description").optional().trim().isLength({ max: 255 }),
];

const assignHodRules = [
  ...departmentIdParam,
  body("hodName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }),
  body("hodId").optional().isInt({ min: 1 }),
  body("mobileNumber").optional().trim(),
];

const updateDepartmentRules = [
  ...departmentIdParam,
  body("departmentName")
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 100 }),
  body("description").optional().trim().isLength({ max: 255 }),
];

module.exports = {
  handleValidation,
  departmentIdParam,
  inlineDepartmentRules,
  assignHodRules,
  updateDepartmentRules,
};
