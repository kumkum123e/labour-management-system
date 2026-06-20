require("dotenv").config();
const { connectDB, getPool } = require("./config/db");

(async () => {
  console.log("Connecting to database for fake data cleanup...");
  const ok = await connectDB();
  if (!ok) {
    console.error("Failed to connect to the database.");
    process.exit(1);
  }

  const pool = getPool();
  const transaction = new (require("mssql/msnodesqlv8").Transaction)(pool);

  try {
    await transaction.begin();
    console.log("Transaction started.");

    // Delete table data in dependency order
    
    console.log("Deleting activity_logs...");
    await transaction.request().query("DELETE FROM activity_logs");

    console.log("Deleting login_logs...");
    await transaction.request().query("DELETE FROM login_logs");

    console.log("Deleting backups...");
    await transaction.request().query("DELETE FROM backups");

    console.log("Deleting notifications...");
    await transaction.request().query("DELETE FROM notifications");

    console.log("Deleting request_approvals...");
    await transaction.request().query("DELETE FROM request_approvals");

    console.log("Deleting outing_requests...");
    await transaction.request().query("DELETE FROM outing_requests");

    console.log("Deleting labour_documents...");
    await transaction.request().query("DELETE FROM labour_documents");

    console.log("Deleting labour_profiles...");
    await transaction.request().query("DELETE FROM labour_profiles");

    console.log("Deleting HOD profiles...");
    await transaction.request().query("DELETE FROM hod_profiles");

    console.log("Resetting primary HOD assignments on departments...");
    await transaction.request().query("UPDATE departments SET primary_hod_id = NULL");

    console.log("Deleting departments...");
    await transaction.request().query("DELETE FROM departments");

    console.log("Deleting all users except the 'admin' user...");
    await transaction.request().query("DELETE FROM users WHERE LOWER(username) != 'admin'");

    await transaction.commit();
    console.log("Database successfully cleaned of all fake/test data!");
  } catch (error) {
    console.error("Error during database cleanup, rolling back changes...");
    console.error(error.message);
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Rollback failed:", rollbackError.message);
    }
    process.exit(1);
  }

  process.exit(0);
})();
