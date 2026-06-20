require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const http = require("http");

const BASE = `http://localhost:${process.env.PORT || 5000}`;

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

(async () => {
  const login = await request("POST", "/api/auth/login", {
    username: "admin_dept_1780479568776",
    password: "admin123",
  });
  const token = login.body?.token;
  if (!token) {
    console.error("Admin login failed");
    process.exit(1);
  }

  const labour = await request(
    "POST",
    "/api/labour",
    {
      employeeId: `EMP${Date.now()}`,
      labourName: "ID Test Worker",
      departmentId: 1,
      hodId: 1,
    },
    token
  );
  console.log("Create labour:", labour.status, labour.body?.message);
  if (labour.body?.data) {
    console.log("  departmentID:", labour.body.data.departmentID);
    console.log("  hodID:", labour.body.data.hodID);
  }

  process.exit(labour.status === 201 ? 0 : 1);
})();
