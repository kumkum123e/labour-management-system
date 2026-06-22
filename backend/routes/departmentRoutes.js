const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const {
  getDepartmentsAdmin,
  getAllDepartments,
  getDepartmentById,
  addDepartmentInline,
  addDepartment,
  assignHod,
  getDepartmentHods,
  setPrimaryHod,
  updateDepartment,
  deleteDepartment,
} = require("../controllers/departmentController");
const {
  handleValidation,
  departmentIdParam,
  inlineDepartmentRules,
  assignHodRules,
  updateDepartmentRules,
} = require("../validators/departmentValidator");
const { primaryHodRules } = require("../validators/hodValidator");

const router = express.Router();

router.get("/admin", protect, authorize("ADMIN"), getDepartmentsAdmin);

router.post(
  "/inline",
  protect,
  authorize("ADMIN"),
  inlineDepartmentRules,
  handleValidation,
  addDepartmentInline
);

router.post(
  "/",
  protect,
  authorize("ADMIN"),
  inlineDepartmentRules,
  handleValidation,
  addDepartment
);

router.get("/", protect, authorize("ADMIN", "HOD", "SECURITY"), getAllDepartments);

router.get(
  "/:id",
  protect,
  authorize("ADMIN", "HOD"),
  departmentIdParam,
  handleValidation,
  getDepartmentById
);

router.get(
  "/:id/hods",
  protect,
  authorize("ADMIN", "HOD", "SECURITY"),
  departmentIdParam,
  handleValidation,
  getDepartmentHods
);

router.post(
  "/:id/hods",
  protect,
  authorize("ADMIN"),
  assignHodRules,
  handleValidation,
  assignHod
);

router.patch(
  "/:id/primary-hod",
  protect,
  authorize("ADMIN"),
  primaryHodRules,
  handleValidation,
  setPrimaryHod
);

router.put(
  "/:id",
  protect,
  authorize("ADMIN"),
  updateDepartmentRules,
  handleValidation,
  updateDepartment
);

router.delete(
  "/:id",
  protect,
  authorize("ADMIN"),
  departmentIdParam,
  handleValidation,
  deleteDepartment
);

module.exports = router;
