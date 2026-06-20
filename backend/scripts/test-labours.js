/**
 * Labour Profile API tests — server running: npm run dev
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");

const BASE = `http://localhost:${process.env.PORT || 5000}`;
let failed = 0;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const req = http.request(url, { method, headers }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
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
  } else console.log(`PASS: ${name}`);
}

(async () => {
  const adminLogin = await request("POST", "/api/auth/login", {
    username: "admin_dept_1780479568776",
    password: "admin123",
  });
  const adminToken = adminLogin.body?.token;

  const hodLogin = await request("POST", "/api/auth/login", {
    username: "rajesh",
    password: "123456",
  });
  const hodToken = hodLogin.body?.token;

  const labourLogin = await request("POST", "/api/auth/login", {
    username: "ravi",
    password: "123456",
  });
  const labourToken = labourLogin.body?.token;

  if (!adminToken) {
    console.error("Admin login failed");
    process.exit(1);
  }

  const code = `EMP${Date.now()}`;
  const create = await request(
    "POST",
    "/api/labours",
    {
      departmentId: 1,
      hodId: 1,
      employeeCode: code,
      labourName: "Phase3 Worker",
      phone: "9876543210",
      address: "Rewari",
      joiningDate: "2026-06-03",
    },
    adminToken
  );
  assert("Admin create labour → 201", create.status === 201, create.body);
  const labourId = create.body?.data?.labourID;

  const dup = await request(
    "POST",
    "/api/labours",
    { departmentId: 1, employeeCode: code, labourName: "Dup" },
    adminToken
  );
  assert("Duplicate employee code → 409", dup.status === 409, dup.body);

  const getAllAdmin = await request("GET", "/api/labours", null, adminToken);
  assert(
    "Admin get all → 200",
    getAllAdmin.status === 200 && getAllAdmin.body.data?.length > 0,
    null
  );

  const getById = await request("GET", `/api/labours/${labourId}`, null, adminToken);
  assert("Get by ID → 200", getById.status === 200, getById.body);

  const hodList = await request("GET", "/api/labours", null, hodToken);
  assert("HOD get department labours → 200", hodList.status === 200, null);

  const labourSelf = await request("GET", "/api/labours", null, labourToken);
  assert(
    "Labour view self only → 200",
    labourSelf.status === 200 && labourSelf.body.data?.length === 1,
    labourSelf.body
  );

  const hodCreateDenied = await request(
    "POST",
    "/api/labours",
    { departmentId: 1, employeeCode: "X", labourName: "X" },
    hodToken
  );
  assert("HOD create denied → 403", hodCreateDenied.status === 403, hodCreateDenied.body);

  const update = await request(
    "PUT",
    `/api/labours/${labourId}`,
    { phone: "9999999999", address: "Updated Rewari" },
    adminToken
  );
  assert("Admin update → 200", update.status === 200, update.body);

  const deactivate = await request(
    "PATCH",
    `/api/labours/${labourId}/deactivate`,
    null,
    adminToken
  );
  assert("Deactivate → 200", deactivate.status === 200, deactivate.body);
  assert(
    "Status Inactive",
    deactivate.body?.data?.status === "Inactive",
    deactivate.body?.data
  );

  console.log(`\n${failed === 0 ? "All labour tests passed." : failed + " failed."}`);
  process.exit(failed > 0 ? 1 : 0);
})();
