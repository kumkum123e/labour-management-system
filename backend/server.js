const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const { connectDB, getPool, isDbConnected } = require("./config/db");
const logger = require("./utils/logger");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const labourRoutes = require("./routes/labourRoutes");
const hodRoutes = require("./routes/hodRoutes");
const outingRoutes = require("./routes/outingRoutes");
const outingAliasRoutes = require("./routes/outingAliasRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const backupRoutes = require("./routes/backupRoutes");

const logsDir = path.join(__dirname, "logs");
const uploadsDir = path.join(__dirname, "uploads");
const backupsDir = path.join(__dirname, "backups");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

if (!process.env.JWT_SECRET) {
  logger.error("JWT_SECRET is missing in .env");
  process.exit(1);
}

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
      ];
      if (process.env.CLIENT_URL) {
        allowedOrigins.push(process.env.CLIENT_URL);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      try {
        const url = new URL(origin);
        const hostname = url.hostname.toLowerCase();
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") {
          return callback(null, true);
        }

        const { isPrivateIp } = require("./utils/ipUtils");
        if (isPrivateIp(hostname)) {
          return callback(null, true);
        }
      } catch (_) {
        /* invalid url, ignore */
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiLimiter);
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.get("/api/health", async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      status: "degraded",
      server: "ok",
      database: "disconnected",
      message: "Database connection failed. Check backend/.env and restart server.",
    });
  }

  try {
    await getPool().request().query("SELECT 1 AS ok");
    res.json({ status: "ok", server: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", server: "ok", database: "error" });
  }
});

app.use((req, res, next) => {
  res.on("finish", () => {
    logger.info(`[REQUEST] ${req.method} ${req.originalUrl} - ${res.statusCode}`);
  });
  next();
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/labours", labourRoutes);
app.use("/api/labour", labourRoutes);
app.use("/api/hods", hodRoutes);
app.use("/api/outing-requests", outingRoutes);
app.use("/api/outing", outingAliasRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/test", testRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

start();
