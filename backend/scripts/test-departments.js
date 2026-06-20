/**
 * Department API tests — server must be running: npm run dev
 * Run: npm run test:departments
 */
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const DEPT_NAME = `Production_${Date.now()}`;
let failed = 0;

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
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

function assert(name, ok, detail) {
  if (!ok) {
    failed++;
    console.error(`FAIL: ${name}`, detail ? JSON.stringify(detail) : "");
    return;
  }
  console.log(`PASS: ${name}`);
}

async function login(username, password) {
  const res = await request("POST", "/api/auth/login", { username, password });
  return res.body?.token;
}

(async () => {
  console.log(`Department API tests @ ${BASE}\n`);

  const adminToken = await login("rajesh", "123456");
  const labourToken = await login("ravi", "123456");

  const adminUser = await request("POST", "/api/auth/register", {
    username: `admin_dept_${Date.now()}`,
    password: "admin123",
    role: "ADMIN",
  });
  const adminOnlyToken = adminUser.body?.token;

  if (!adminOnlyToken) {
    console.error("Could not get ADMIN token. Is server running?");
    process.exit(1);
  }

  const noToken = await request("POST", "/api/departments", {
    departmentName: DEPT_NAME,
    description: "Test",
  });
  assert("Invalid token → 401", noToken.status === 401, noToken.body);

  const labourCreate = await request(
    "POST",
    "/api/departments",
    { departmentName: DEPT_NAME, description: "Test" },
    labourToken
  );
  assert("Labour create → 403", labourCreate.status === 403, labourCreate.body);

  const create = await request(
    "POST",
    "/api/departments",
    { departmentName: DEPT_NAME, description: "Production Department" },
    adminOnlyToken
  );
  assert("Admin create → 201", create.status === 201, create.body);

  const duplicate = await request(
    "POST",
    "/api/departments",
    { departmentName: DEPT_NAME, description: "Duplicate" },
    adminOnlyToken
  );
  assert("Duplicate name → 409", duplicate.status === 409, duplicate.body);

  const hodList = await request("GET", "/api/departments", null, adminToken);
  assert(
    "HOD get all → 200",
    hodList.status === 200 && Array.isArray(hodList.body),
    hodList.body
  );

  const labourList = await request("GET", "/api/departments", null, labourToken);
  assert("Labour get all → 403", labourList.status === 403, labourList.body);

  const invalidBody = await request(
    "POST",
    "/api/departments",
    { departmentName: "AB", description: "Too short" },
    adminOnlyToken
  );
  assert("Validation min length → 400", invalidBody.status === 400, invalidBody.body);

  console.log(`\n${failed === 0 ? "All department tests passed." : failed + " failed."}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
