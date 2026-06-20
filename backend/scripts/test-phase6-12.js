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
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const assert = (n, ok, b) => {
  if (!ok) {
    failed++;
    console.error("FAIL:", n, b ? JSON.stringify(b) : "");
  } else console.log("PASS:", n);
};

const login = async (u, p) => (await req("POST", "/api/auth/login", { username: u, password: p })).body?.token;

(async () => {
  const admin = await login("admin_dept_1780479568776", "admin123");
  const hod = await login("rajesh", "123456");
  const labour = await login("ravi", "123456");

  assert("Admin login", !!admin, null);
  assert("HOD login", !!hod, null);
  assert("Labour login", !!labour, null);

  const adminDash = await req("GET", "/api/dashboard/admin", null, admin);
  assert("Admin dashboard", adminDash.status === 200 && adminDash.body.data?.totalDepartments >= 0, adminDash.body);

  const hodDash = await req("GET", "/api/dashboard/hod", null, hod);
  assert("HOD dashboard", hodDash.status === 200, hodDash.body);

  const labourDash = await req("GET", "/api/dashboard/labour", null, labour);
  assert("Labour dashboard", labourDash.status === 200, labourDash.body);

  const createOut = await req("POST", "/api/outing-requests", {
    requestDate: "2026-06-10",
    outTime: "10:00",
    returnTime: "14:00",
    reason: "Personal work",
  }, labour);
  assert("Create outing for workflow", createOut.status === 201, createOut.body);
  const reqId = createOut.body?.data?.requestID;

  const hodNotif = await req("GET", "/api/notifications?unread=true", null, hod);
  assert("HOD notified on create", hodNotif.status === 200 && hodNotif.body.data?.length > 0, null);

  const approve = await req("PUT", `/api/outing/${reqId}/approve`, { remarks: "Approved via PUT" }, hod);
  assert("PUT approve", approve.status === 200 && approve.body.data?.approvedBy, approve.body);

  const labourNotif = await req("GET", "/api/notifications", null, labour);
  assert("Labour notified on approve", labourNotif.status === 200, null);

  const createOut2 = await req("POST", "/api/outing-requests", {
    requestDate: "2026-06-11",
    outTime: "11:00",
    reason: "Test reject",
  }, labour);
  const reqId2 = createOut2.body?.data?.requestID;

  const reject = await req("PUT", `/api/outing/${reqId2}/reject`, { remarks: "Not allowed" }, hod);
  assert("PUT reject", reject.status === 200 && reject.body.data?.rejectedBy, reject.body);

  const logs = await req("GET", "/api/reports/activity-logs?limit=5", null, admin);
  assert("Activity logs", logs.status === 200 && logs.body.data?.length > 0, null);

  const monthly = await req("GET", "/api/reports/monthly", null, admin);
  assert("Monthly report", monthly.status === 200, monthly.body);

  const deptReport = await req("GET", "/api/reports/department/1", null, admin);
  assert("Department report", deptReport.status === 200, deptReport.body);

  console.log(failed ? `\n${failed} failed` : "\nPhase 6-12 tests passed");
  process.exit(failed > 0 ? 1 : 0);
})();
