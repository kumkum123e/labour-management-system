const { isPrivateIp } = require("../utils/ipUtils");

const testCases = [
  // Loopbacks
  { ip: "127.0.0.1", expected: true },
  { ip: "::1", expected: true },
  { ip: "localhost", expected: true },
  { ip: "::ffff:127.0.0.1", expected: true },
  { ip: "127.0.0.99", expected: true },
  
  // Windows IPv6 with Zone Indexes
  { ip: "fe80::abcd:ef01:2345:6789%12", expected: true },
  { ip: "fe80::1%lo0", expected: true },
  { ip: "::1%1", expected: true },

  // Link-Local
  { ip: "fe80::", expected: true },
  { ip: "fe80::abcd", expected: true },
  { ip: "169.254.1.2", expected: true },
  { ip: "::ffff:169.254.5.5", expected: true },

  // Unique Local Addresses
  { ip: "fc00::1", expected: true },
  { ip: "fd00:1234::abcd", expected: true },

  // Private Subnets
  { ip: "192.168.1.15", expected: true },
  { ip: "::ffff:192.168.0.1", expected: true },
  { ip: "10.5.5.5", expected: true },
  { ip: "::ffff:10.0.0.1", expected: true },
  { ip: "172.16.0.1", expected: true },
  { ip: "172.31.255.255", expected: true },
  { ip: "::ffff:172.20.10.2", expected: true },

  // Public Subnets (Should be false)
  { ip: "8.8.8.8", expected: false },
  { ip: "172.15.255.255", expected: false },
  { ip: "172.32.0.1", expected: false },
  { ip: "192.169.1.1", expected: false },
  { ip: "203.0.113.195", expected: false },
  { ip: "2001:db8::1", expected: false },
];

let failed = 0;
for (const tc of testCases) {
  const actual = isPrivateIp(tc.ip);
  if (actual !== tc.expected) {
    console.error(`FAIL: isPrivateIp("${tc.ip}") returned ${actual}, expected ${tc.expected}`);
    failed++;
  } else {
    console.log(`PASS: isPrivateIp("${tc.ip}") -> ${actual}`);
  }
}

if (failed === 0) {
  console.log("\nAll IP check test cases passed successfully!");
  process.exit(0);
} else {
  console.error(`\n${failed} test case(s) failed.`);
  process.exit(1);
}
