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

const labourIdParam = [
  param("id").isInt({ min: 1 }).withMessage("Valid labour ID required"),
];

const createLabourRules = [
  body("employeeCode").trim().notEmpty().withMessage("Employee code is required"),
  body("departmentId").optional().isInt({ min: 1 }),
  body("departmentName").optional().trim().isLength({ min: 2, max: 100 }),
  body().custom((_, { req }) => {
    if (!req.body.departmentId && !req.body.departmentName) {
      throw new Error("Department is required");
    }
    return true;
  }),
  body("userId").optional().isInt({ min: 1 }),
  body("labourName").trim().notEmpty().isLength({ min: 2, max: 100 }),
  body("hodId").optional().isInt({ min: 1 }),
  body("hodMobile").optional().trim().isLength({ max: 20 }),
  body("hodName").optional().trim().isLength({ min: 2, max: 100 }),
  body("phone").optional().trim().isLength({ max: 20 }),
  body("address").optional().trim().isLength({ max: 255 }),
  body("joiningDate").optional().isISO8601().withMessage("Invalid joining date"),
  body("contractorName").optional().trim(),
  body("password").optional().trim().isLength({ min: 6 }),
  body("photoUrl").optional().trim(),
];

const updateLabourRules = [
  ...labourIdParam,
  body("employeeCode").optional().trim().notEmpty(),
  body("labourName").optional().trim().isLength({ min: 2, max: 100 }),
  body("departmentId").optional().isInt({ min: 1 }),
  body("hodId").optional({ nullable: true }).isInt({ min: 1 }),
  body("hodName").optional().trim().isLength({ min: 2, max: 100 }),
  body("hodMobile").optional().trim().isLength({ max: 20 }),
  body("phone").optional().trim().isLength({ max: 20 }),
  body("address").optional().trim().isLength({ max: 255 }),
  body("joiningDate").optional().isISO8601(),
  body("contractorName").optional().trim(),
  body("photoUrl").optional().trim(),
];

module.exports = {
  handleValidation,
  labourIdParam,
  createLabourRules,
  updateLabourRules,
};
