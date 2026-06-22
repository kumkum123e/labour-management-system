const { cleanIpAddress, getClientIp, isPrivateIp, isAdminIpAllowed } = require("../utils/ipUtils");

console.log("=== Running IP Utility Tests ===\n");

const cleaningCases = [
  { ip: "127.0.0.1", expected: "127.0.0.1" },
  { ip: "127.0.0.1:5000", expected: "127.0.0.1" },
  { ip: "  192.168.1.15:3000 ", expected: "192.168.1.15" },
  { ip: "[::1]", expected: "::1" },
  { ip: "[::1]:5000", expected: "::1" },
  { ip: "fe80::abcd:ef01:2345:6789%12", expected: "fe80::abcd:ef01:2345:6789" },
  { ip: "::ffff:192.168.1.1:5000", expected: "::ffff:192.168.1.1" },
  { ip: "203.0.113.195, 70.41.3.18, 150.172.238.178", expected: "203.0.113.195" },
  { ip: "  192.168.0.1  , 10.0.0.1", expected: "192.168.0.1" },
];

let failed = 0;

console.log("--- Testing cleanIpAddress ---");
for (const tc of cleaningCases) {
  const actual = cleanIpAddress(tc.ip);
  if (actual !== tc.expected) {
    console.error(`FAIL: cleanIpAddress("${tc.ip}") -> "${actual}", expected "${tc.expected}"`);
    failed++;
  } else {
    console.log(`PASS: cleanIpAddress("${tc.ip}") -> "${actual}"`);
  }
}

console.log("\n--- Testing getClientIp (Mock Request) ---");
const mockRequests = [
  {
    req: { ip: "192.168.1.100" },
    expected: "192.168.1.100"
  },
  {
    req: {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" }
    },
    expected: "203.0.113.5"
  },
  {
    req: {
      socket: { remoteAddress: "[::1]:32100" }
    },
    expected: "::1"
  }
];

for (let i = 0; i < mockRequests.length; i++) {
  const tc = mockRequests[i];
  const actual = getClientIp(tc.req);
  if (actual !== tc.expected) {
    console.error(`FAIL: getClientIp(mockReq[${i}]) -> "${actual}", expected "${tc.expected}"`);
    failed++;
  } else {
    console.log(`PASS: getClientIp(mockReq[${i}]) -> "${actual}"`);
  }
}

console.log("\n--- Testing isPrivateIp ---");
const privateIpCases = [
  { ip: "127.0.0.1", expected: true },
  { ip: "::1", expected: true },
  { ip: "192.168.1.25", expected: true },
  { ip: "10.0.0.1", expected: true },
  { ip: "172.16.50.50", expected: true },
  { ip: "172.15.1.1", expected: false }, // Outside private range (172.16 - 172.31)
  { ip: "8.8.8.8", expected: false },
  { ip: "203.0.113.5", expected: false },
];

for (const tc of privateIpCases) {
  const actual = isPrivateIp(tc.ip);
  if (actual !== tc.expected) {
    console.error(`FAIL: isPrivateIp("${tc.ip}") -> ${actual}, expected ${tc.expected}`);
    failed++;
  } else {
    console.log(`PASS: isPrivateIp("${tc.ip}") -> ${actual}`);
  }
}

console.log("\n--- Testing isAdminIpAllowed ---");

// Test with 'local' mode (Only localhost allowed)
process.env.ADMIN_ACCESS_MODE = "local";
console.log("Access Mode set to 'local'");
const localModeCases = [
  { ip: "127.0.0.1", expected: true },
  { ip: "::1", expected: true },
  { ip: "192.168.1.15", expected: false },
  { ip: "8.8.8.8", expected: false },
];
for (const tc of localModeCases) {
  const actual = isAdminIpAllowed(tc.ip);
  if (actual !== tc.expected) {
    console.error(`FAIL [local mode]: isAdminIpAllowed("${tc.ip}") -> ${actual}, expected ${tc.expected}`);
    failed++;
  } else {
    console.log(`PASS [local mode]: isAdminIpAllowed("${tc.ip}") -> ${actual}`);
  }
}

// Test with 'whitelisted' mode
process.env.ADMIN_ACCESS_MODE = "whitelisted";
process.env.ADMIN_WHITELISTED_IPS = "192.168.1.50, 203.0.113.10";
console.log("\nAccess Mode set to 'whitelisted' with whitelisted IPs: '192.168.1.50, 203.0.113.10'");
const whitelistModeCases = [
  { ip: "127.0.0.1", expected: true }, // Loopback is always allowed
  { ip: "192.168.1.50", expected: true }, // Whitelisted
  { ip: "203.0.113.10", expected: true }, // Whitelisted
  { ip: "192.168.1.15", expected: false }, // Not whitelisted private IP
  { ip: "8.8.8.8", expected: false }, // Public IP
];
for (const tc of whitelistModeCases) {
  const actual = isAdminIpAllowed(tc.ip);
  if (actual !== tc.expected) {
    console.error(`FAIL [whitelisted mode]: isAdminIpAllowed("${tc.ip}") -> ${actual}, expected ${tc.expected}`);
    failed++;
  } else {
    console.log(`PASS [whitelisted mode]: isAdminIpAllowed("${tc.ip}") -> ${actual}`);
  }
}

// Test with 'private' mode (default)
process.env.ADMIN_ACCESS_MODE = "private";
console.log("\nAccess Mode set to 'private'");
const privateModeCases = [
  { ip: "127.0.0.1", expected: true },
  { ip: "192.168.1.15", expected: true },
  { ip: "8.8.8.8", expected: false },
];
for (const tc of privateModeCases) {
  const actual = isAdminIpAllowed(tc.ip);
  if (actual !== tc.expected) {
    console.error(`FAIL [private mode]: isAdminIpAllowed("${tc.ip}") -> ${actual}, expected ${tc.expected}`);
    failed++;
  } else {
    console.log(`PASS [private mode]: isAdminIpAllowed("${tc.ip}") -> ${actual}`);
  }
}

if (failed === 0) {
  console.log("\nAll IP check and configuration tests passed successfully!");
  process.exit(0);
} else {
  console.error(`\n${failed} test case(s) failed.`);
  process.exit(1);
}
