require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { connectDB, getPool, sql } = require("../config/db");

(async () => {
  console.log("Connecting to database for security role and column migration...");
  const ok = await connectDB();
  if (!ok) {
    console.error("Failed to connect to the database.");
    process.exit(1);
  }

  const pool = getPool();

  try {
    console.log("Ensuring SECURITY role exists in 'roles' table...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM roles WHERE role_id = 4)
      BEGIN
        SET IDENTITY_INSERT roles ON;
        INSERT INTO roles (role_id, role_name) VALUES (4, 'SECURITY');
        SET IDENTITY_INSERT roles OFF;
        PRINT 'SECURITY role inserted successfully.';
      END
      ELSE
      BEGIN
        PRINT 'SECURITY role already exists.';
      END
    `);

    console.log("Ensuring columns exist in 'outing_requests' table...");
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('outing_requests') AND name = 'security_user_id')
      BEGIN
        ALTER TABLE outing_requests ADD security_user_id INT FOREIGN KEY REFERENCES users(user_id) NULL;
        PRINT 'Column security_user_id added successfully.';
      END
      ELSE
      BEGIN
        PRINT 'Column security_user_id already exists.';
      END

      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('outing_requests') AND name = 'security_signature')
      BEGIN
        ALTER TABLE outing_requests ADD security_signature VARCHAR(MAX) NULL;
        PRINT 'Column security_signature added successfully.';
      END
      ELSE
      BEGIN
        PRINT 'Column security_signature already exists.';
      END
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:");
    console.error(error.message);
    process.exit(1);
  }
  process.exit(0);
})();
