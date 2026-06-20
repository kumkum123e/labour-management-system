#!/usr/bin/env node
/**
 * Setup HOD profile and labour assignments
 * Run this AFTER the server is running: npm run dev
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
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
  try {
    console.log('Setting up HOD profiles and labour assignments...\n');

    // Get admin token
    console.log('Step 1: Getting admin authentication token...');
    const loginResp = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginResp.status !== 200) {
      throw new Error('Admin login failed: ' + JSON.stringify(loginResp.body));
    }
    
    const adminToken = loginResp.body.token || loginResp.body.data?.token;
    console.log('✓ Admin authenticated\n');

    // Get all labours to find "ravi"
    console.log('Step 2: Finding labour "ravi" in the system...');
    const labourResp = await request('GET', '/api/labours', null, adminToken);
    
    if (labourResp.status !== 200) {
      throw new Error('Failed to fetch labours: ' + JSON.stringify(labourResp.body));
    }

    const ravi = labourResp.body.data?.find(l => 
      l.username === 'ravi' || l.labourName?.toLowerCase() === 'ravi'
    );

    if (!ravi) {
      throw new Error('Labour "ravi" not found in system');
    }

    console.log('✓ Found labour ravi (labourID: ' + ravi.labourID + ')\n');

    // Find HOD with username 'hod_user' or name 'HOD User'
    console.log('Step 3: Fetching HOD list to locate "hod_user"...');
    const hodsResp = await request('GET', '/api/hods', null, adminToken);
    if (hodsResp.status !== 200) {
      throw new Error('Failed to fetch HODs: ' + JSON.stringify(hodsResp.body));
    }
    const hodUser = hodsResp.body.data?.find(h =>
      h.username === 'hod_user' || h.hodName?.toLowerCase() === 'hod user'
    );
    if (!hodUser) {
      throw new Error('HOD "hod_user" not found in the system');
    }
    console.log('✓ Found HOD user (hodID: ' + hodUser.hodID + ')\n');

    // First, align Ravi's department with HOD User's department
    console.log(`Step 4: Aligning labour ravi's department with HOD department (${hodUser.departmentID})...`);
    const updateDeptResp = await request('PUT', '/api/labours/' + ravi.labourID, {
      departmentId: hodUser.departmentID
    }, adminToken);

    if (updateDeptResp.status !== 200) {
      throw new Error('Failed to update labour department: ' + JSON.stringify(updateDeptResp.body));
    }
    console.log('✓ Labour department aligned\n');

    // Assign labour to HOD
    console.log('Step 5: Assigning labour "ravi" to HOD...');
    const assignResp = await request('PATCH', '/api/hods/assign-labour/' + ravi.labourID, {
      hodId: hodUser.hodID
    }, adminToken);

    if (assignResp.status === 200) {
      console.log('✓ Labour ravi assigned to HOD\n');
    } else {
      console.warn('⚠ Assignment response:', assignResp.status, assignResp.body);
    }

    console.log('✅ Setup complete!\n');
    console.log('Next steps:');
    console.log('1. Open frontend on http://localhost:3001');
    console.log('2. Log in as HOD: hod_user / hod123');
    console.log('3. Go to HOD Dashboard - you should see IT Department');
    console.log('4. Log out and log in as Labour: ravi / 123456');
    console.log('5. Create an Outing Request');
    console.log('6. Log out and log back as HOD - you should see Pending Requests\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
