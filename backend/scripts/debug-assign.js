require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDB } = require("../config/db");
const hodService = require("../services/hodService");

(async () => {
  await connectDB();
  try {
    const result = await hodService.assignLabourToHod(2, 1);
    console.log("Success:", result);
  } catch (error) {
    console.error("Caught error:", error.constructor.name);
    console.error("Stack:", error.stack);
    const { AppError } = require("../services/departmentService");
    console.log("instanceof AppError:", error instanceof AppError);
  }
  process.exit(0);
})();
