require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");
const BASE = `http://localhost:${process.env.PORT || 5000}`;
let failed = 0;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = http.request(url, { method, headers }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const assert = (n, ok, b) => {
  if (!ok) { failed++; console.error("FAIL:", n, b ? JSON.stringify(b) : ""); }
  else console.log("PASS:", n);
};

const login = async (u, p) => (await req("POST", "/api/auth/login", { username: u, password: p })).body?.token;

(async () => {
  const admin = await login("admin_dept_1780479568776", "admin123");
  const hod = await login("rajesh", "123456");
  const labour = await login("ravi", "123456");

  const primary = await req("PATCH", "/api/departments/1/primary-hod", { hodId: 1 }, admin);
  assert("Set primary HOD", primary.status === 200, primary.body);

  // Update labour's department to 1 to align with HOD 1's department
  const updateDept = await req("PUT", "/api/labours/2", { departmentId: 1 }, admin);
  assert("Prepare department alignment", updateDept.status === 200, updateDept.body);

  const assign = await req("PATCH", "/api/hods/assign-labour/2", { hodId: 1 }, admin);
  assert("Assign HOD to labour", assign.status === 200, assign.body);

  const createOut = await req("POST", "/api/outing-requests", {
    requestDate: "2026-06-03",
    outTime: "14:00",
    returnTime: "18:00",
    reason: "Medical visit",
  }, labour);
  assert("Labour create outing", createOut.status === 201, createOut.body);
  const reqId = createOut.body?.data?.requestID;

  const hodList = await req("GET", "/api/outing-requests", null, hod);
  assert("HOD sees requests", hodList.status === 200 && hodList.body.data?.length > 0, null);

  const approve = await req("PATCH", `/api/outing-requests/${reqId}/approve`, { remarks: "OK" }, hod);
  assert("HOD approve", approve.status === 200, approve.body);

  const monitor = await req("GET", "/api/outing-requests/admin/monitor", null, admin);
  assert("Admin monitor", monitor.status === 200, monitor.body?.data?.summary);

  console.log(failed ? `\n${failed} failed` : "\nPhase 4 & 5 tests passed");
  process.exit(failed > 0 ? 1 : 0);
})();
