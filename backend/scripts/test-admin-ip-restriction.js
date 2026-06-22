const http = require("http");
const express = require("express");

// Set up env variables for test
process.env.JWT_SECRET = "test_secret_key_12345";
process.env.DB_SERVER = "localhost\\SQLEXPRESS";
process.env.DB_DATABASE = "LabourManagementSystem";

const { connectDB } = require("../config/db");
const authRoutes = require("../routes/authRoutes");
const { getClientIp, isAdminIpAllowed } = require("../utils/ipUtils");

const PORT = 5099;
const BASE = `http://localhost:${PORT}`;

function request(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = { "Content-Type": "application/json", ...headers };

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let bodyJson = null;
        try {
          bodyJson = data ? JSON.parse(data) : null;
        } catch {
          bodyJson = { raw: data };
        }
        resolve({ status: res.statusCode, body: bodyJson });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  console.log("=== Start IP Restriction Integration Test ===\n");
  
  // Set up mock express app
  const app = express();
  app.set("trust proxy", true); // Ensure express trusts headers like X-Forwarded-For
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  const server = app.listen(PORT, async () => {
    console.log(`Mock server listening on port ${PORT}`);
    let failed = 0;

    try {
      // 1. Test Network Status under 'private' mode (default)
      process.env.ADMIN_ACCESS_MODE = "private";
      console.log("\n[TEST 1] Mode: private (default)");
      
      const resLocal = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "127.0.0.1"
      });
      console.log(`Local network-status (127.0.0.1): ${resLocal.body.isPrivate === true ? "PASS" : "FAIL"}`);
      if (resLocal.body.isPrivate !== true) failed++;

      const resPrivate = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "192.168.1.15"
      });
      console.log(`Private LAN network-status (192.168.1.15): ${resPrivate.body.isPrivate === true ? "PASS" : "FAIL"}`);
      if (resPrivate.body.isPrivate !== true) failed++;

      const resPublic = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "203.0.113.10"
      });
      console.log(`Public network-status (203.0.113.10): ${resPublic.body.isPrivate === false ? "PASS" : "FAIL"}`);
      if (resPublic.body.isPrivate !== false) failed++;

      // 2. Test Network Status under 'local' mode
      process.env.ADMIN_ACCESS_MODE = "local";
      console.log("\n[TEST 2] Mode: local (loopback only)");

      const resLocal2 = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "127.0.0.1"
      });
      console.log(`Local network-status (127.0.0.1): ${resLocal2.body.isPrivate === true ? "PASS" : "FAIL"}`);
      if (resLocal2.body.isPrivate !== true) failed++;

      const resPrivate2 = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "192.168.1.15"
      });
      console.log(`Private LAN network-status (192.168.1.15): ${resPrivate2.body.isPrivate === false ? "PASS" : "FAIL"}`);
      if (resPrivate2.body.isPrivate !== false) failed++;

      // 3. Test Network Status under 'whitelisted' mode
      process.env.ADMIN_ACCESS_MODE = "whitelisted";
      process.env.ADMIN_WHITELISTED_IPS = "192.168.1.50, 203.0.113.20";
      console.log("\n[TEST 3] Mode: whitelisted (192.168.1.50, 203.0.113.20)");

      const resWhitelist1 = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "192.168.1.50"
      });
      console.log(`Whitelisted LAN IP (192.168.1.50): ${resWhitelist1.body.isPrivate === true ? "PASS" : "FAIL"}`);
      if (resWhitelist1.body.isPrivate !== true) failed++;

      const resWhitelist2 = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "203.0.113.20"
      });
      console.log(`Whitelisted Public IP (203.0.113.20): ${resWhitelist2.body.isPrivate === true ? "PASS" : "FAIL"}`);
      if (resWhitelist2.body.isPrivate !== true) failed++;

      const resWhitelistBlocked = await request("GET", "/api/auth/network-status", {
        "x-forwarded-for": "192.168.1.15"
      });
      console.log(`Non-Whitelisted LAN IP (192.168.1.15): ${resWhitelistBlocked.body.isPrivate === false ? "PASS" : "FAIL"}`);
      if (resWhitelistBlocked.body.isPrivate !== false) failed++;

      console.log(`\n=== Integration Test Finished. ${failed === 0 ? "SUCCESS" : failed + " Failures"} ===`);
      server.close();
      process.exit(failed > 0 ? 1 : 0);
    } catch (err) {
      console.error("Error during integration test:", err);
      server.close();
      process.exit(1);
    }
  });
})();
