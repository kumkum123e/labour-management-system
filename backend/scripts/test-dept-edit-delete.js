const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const BASE = `http://localhost:${process.env.PORT || 5000}`;
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
  console.log(`Testing Edit & Delete Departments @ ${BASE}\n`);

  const adminToken = await login("admin", "admin123");
  if (!adminToken) {
    console.error("Could not log in as admin. Is server running?");
    process.exit(1);
  }

  // 1. Create a temporary department for testing
  const tempName = `TempDept_${Date.now()}`;
  const createRes = await request(
    "POST",
    "/api/departments",
    { departmentName: tempName, description: "Before edit" },
    adminToken
  );
  assert("Create temp department for edit/delete test", createRes.status === 201, createRes.body);
  const deptId = createRes.body?.data?.departmentID;
  if (!deptId) {
    console.error("Temp department creation failed");
    process.exit(1);
  }

  // 2. Edit department
  const updatedName = `${tempName}_Edited`;
  const updateRes = await request(
    "PUT",
    `/api/departments/${deptId}`,
    { departmentName: updatedName, description: "After edit" },
    adminToken
  );
  assert("Update department name & description", updateRes.status === 200, updateRes.body);

  // 3. Confirm update in database
  const getRes = await request("GET", `/api/departments/${deptId}`, null, adminToken);
  assert(
    "Get updated department matches new values",
    getRes.status === 200 &&
      getRes.body?.data?.departmentName === updatedName &&
      getRes.body?.data?.description === "After edit",
    getRes.body
  );

  // 4. Delete department
  const deleteRes = await request("DELETE", `/api/departments/${deptId}`, null, adminToken);
  assert("Delete department (soft delete)", deleteRes.status === 200, deleteRes.body);

  // 5. Confirm soft-delete behavior (should return 404 because is_active is 0)
  const getDeletedRes = await request("GET", `/api/departments/${deptId}`, null, adminToken);
  assert("Deleted department is no longer fetchable (404)", getDeletedRes.status === 404, getDeletedRes.body);

  console.log(`\n${failed === 0 ? "All edit/delete department API tests passed." : failed + " failed."}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
