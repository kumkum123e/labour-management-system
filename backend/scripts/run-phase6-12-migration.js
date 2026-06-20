require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { connectDB, getPool, closeDB } = require("../config/db");

const run = async () => {
  await connectDB();
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "database", "phase6-12-migration.sql"),
    "utf8"
  );
  const batches = sql.split(/\r?\nGO\r?\n/i).map((b) => b.trim()).filter(Boolean);
  for (const batch of batches) {
    await getPool().request().query(batch);
    console.log("OK batch:", batch.slice(0, 60).replace(/\s+/g, " "));
  }
  await closeDB?.();
  console.log("Migration complete");
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
