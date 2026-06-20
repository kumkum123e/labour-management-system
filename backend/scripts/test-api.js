/**
 * API tests — start server first: npm run dev
 * Then: npm run test:api
 */
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const TEST_USER = `testuser_${Date.now()}`;
const TEST_PASSWORD = "TestPass123!";

let failed = 0;

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let bodyJson = null;
        try {
          bodyJson = data ? JSON.parse(data) : null;
        } catch {
          bodyJson = { raw: data };
        }
        resolve({ status: res.statusCode, body: bodyJson, raw: data });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(name, condition, detail) {
  if (!condition) {
    failed++;
    console.error(`FAIL: ${name}`, detail ? JSON.stringify(detail) : "");
    return false;
  }
  console.log(`PASS: ${name}`);
  return true;
}

(async () => {
  console.log(`Testing API at ${BASE}\n`);

  try {
    const health = await request("GET", "/api/health");
    if (health.status === 503) {
      console.warn("WARN: Database disconnected.\n");
    } else {
      assert("Health endpoint OK", health.status === 200, health.body);
    }

    const root = await request("GET", "/");
    assert(
      "Root endpoint",
      root.status === 200 && root.raw.includes("Backend"),
      root
    );

    const reg = await request("POST", "/api/auth/register", {
      username: TEST_USER,
      password: TEST_PASSWORD,
      role: "ADMIN",
    });

    if (reg.status === 503) {
      console.error("\nDatabase not connected. Restart backend.\n");
      process.exit(1);
    }

    assert("Register admin", reg.status === 201 && reg.body?.token, reg.body);
    const token = reg.body?.token;

    const dup = await request("POST", "/api/auth/register", {
      username: TEST_USER,
      password: TEST_PASSWORD,
      role: "ADMIN",
    });
    assert("Reject duplicate username", dup.status === 400, dup.body);

    const loginBad = await request("POST", "/api/auth/login", {
      username: TEST_USER,
      password: "wrong",
    });
    assert("Reject wrong password", loginBad.status === 401, loginBad.body);

    const login = await request("POST", "/api/auth/login", {
      username: TEST_USER,
      password: TEST_PASSWORD,
    });
    assert("Login success", login.status === 200 && login.body?.token, login.body);

    const existingLogin = await request("POST", "/api/auth/login", {
      username: "rajesh",
      password: "123456",
    });
    assert(
      "Login existing user (rajesh)",
      existingLogin.status === 200 && existingLogin.body?.token,
      existingLogin.body
    );

    const noToken = await request("GET", "/api/test/protected");
    assert("Protected without token", noToken.status === 401, noToken.body);

    const protectedOk = await request("GET", "/api/test/protected", null, token);
    assert("Protected with token", protectedOk.status === 200, protectedOk.body);

    const adminOk = await request("GET", "/api/test/admin", null, token);
    assert("Admin route for ADMIN role", adminOk.status === 200, adminOk.body);

    const hodDenied = await request("GET", "/api/test/admin", null, existingLogin.body?.token);
    assert(
      "Admin route denied for HOD (rajesh)",
      hodDenied.status === 403,
      hodDenied.body
    );

    console.log(`\n${failed === 0 ? "All tests passed." : failed + " test(s) failed."}`);
    process.exit(failed > 0 ? 1 : 0);
  } catch (e) {
    console.error("Test runner error:", e.message);
    console.error("Is the server running? npm run dev");
    process.exit(1);
  }
})();
