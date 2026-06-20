const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { getAllHods, assignLabourToHod, updateHod } = require("../controllers/hodController");
const { handleValidation, assignLabourHodRules, updateHodRules } = require("../validators/hodValidator");

const router = express.Router();

router.get("/", protect, authorize("ADMIN", "HOD"), getAllHods);

router.patch(
  "/assign-labour/:labourId",
  protect,
  authorize("ADMIN"),
  assignLabourHodRules,
  handleValidation,
  assignLabourToHod
);

router.patch(
  "/:id",
  protect,
  authorize("ADMIN"),
  updateHodRules,
  handleValidation,
  updateHod
);

module.exports = router;
