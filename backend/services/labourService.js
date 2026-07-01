const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../config/db");
const departmentService = require("./departmentService");
const hodService = require("./hodService");
const { AppError } = require("./departmentService");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const AdmZip = require("adm-zip");

const LABOUR_ROLE_ID = 3;

const mapLabour = (row) => ({
  labourID: row.labour_id,
  userID: row.user_id,
  departmentID: row.department_id,
  departmentName: row.department_name,
  hodID: row.assigned_hod_id,
  hodName: row.hod_name,
  employeeCode: row.employee_id,
  labourName: row.labour_name,
  contractorName: row.contractor_name,
  phone: row.mobile_number,
  address: row.address,
  joiningDate: row.joining_date,
  status: row.status,
  createdAt: row.created_at,
  username: row.username,
  photoUrl: row.photo_url,
});

const getHodDepartmentId = async (userId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .query("SELECT department_id FROM hod_profiles WHERE user_id = @user_id");

  return result.recordset[0]?.department_id ?? null;
};

const getLabourByUserId = async (userId) => {
  const pool = getPool();
  const result = await pool.request().input("user_id", sql.Int, userId).query(
    `SELECT lp.labour_id, lp.user_id, lp.department_id, d.department_name,
            lp.assigned_hod_id, h.hod_name, lp.employee_id, lp.labour_name,
            lp.contractor_name, lp.mobile_number, lp.address, lp.joining_date,
            lp.status, lp.created_at, u.username, lp.photo_url
     FROM labour_profiles lp
     LEFT JOIN departments d ON lp.department_id = d.department_id
     LEFT JOIN hod_profiles h ON lp.assigned_hod_id = h.hod_id
     LEFT JOIN users u ON lp.user_id = u.user_id
     WHERE lp.user_id = @user_id`
  );
  return result.recordset[0] || null;
};

const baseSelect = `
  SELECT lp.labour_id, lp.user_id, lp.department_id, d.department_name,
         lp.assigned_hod_id, h.hod_name, lp.employee_id, lp.labour_name,
         lp.contractor_name, lp.mobile_number, lp.address, lp.joining_date,
         lp.status, lp.created_at, u.username, lp.photo_url
  FROM labour_profiles lp
  LEFT JOIN departments d ON lp.department_id = d.department_id
  LEFT JOIN hod_profiles h ON lp.assigned_hod_id = h.hod_id
  LEFT JOIN users u ON lp.user_id = u.user_id
`;

const createLabourProfile = async (data) => {
  const {
    userId,
    labourName,
    departmentId,
    departmentName,
    hodId,
    hodName,
    hodMobile,
    employeeCode,
    phone,
    address,
    joiningDate,
    contractorName,
    password = "123456",
  } = data;

  if (!employeeCode) {
    throw new AppError("employeeCode is required", 400);
  }
  if (!departmentId && !departmentName) {
    throw new AppError("departmentName or departmentId is required", 400);
  }

  const pool = getPool();
  let deptId = departmentId ? parseInt(departmentId, 10) : null;

  if (!deptId && departmentName) {
    const dept = await departmentService.findOrCreateDepartment(departmentName.trim());
    deptId = dept.department_id;
  }

  await departmentService.getDepartmentById(deptId);

  let hodIdNum = hodId ? parseInt(hodId, 10) : null;
  if (!hodIdNum && hodName) {
    const hod = await hodService.findOrCreateHod(hodName.trim(), deptId, hodMobile || phone);
    hodIdNum = hod.hod_id;
  } else if (hodIdNum) {
    const hod = await hodService.getHodById(hodIdNum);
    if (hod.departmentID !== deptId) {
      throw new AppError("Selected HOD does not belong to the department", 400);
    }
  }

  const dup = await pool
    .request()
    .input("employee_id", sql.VarChar, employeeCode.trim())
    .query("SELECT labour_id FROM labour_profiles WHERE employee_id = @employee_id");

  if (dup.recordset.length > 0) {
    throw new AppError("Employee code already exists", 409);
  }

  let userIdNum = userId ? parseInt(userId, 10) : null;

  if (userIdNum) {
    const userCheck = await pool
      .request()
      .input("user_id", sql.Int, userIdNum)
      .query(
        "SELECT user_id, username, role_id FROM users WHERE user_id = @user_id AND is_active = 1"
      );
    if (userCheck.recordset.length === 0) {
      throw new AppError("User not found", 404);
    }
    if (userCheck.recordset[0].role_id !== LABOUR_ROLE_ID) {
      throw new AppError("User must have LABOUR role", 400);
    }
    const existingProfile = await getLabourByUserId(userIdNum);
    if (existingProfile) {
      throw new AppError("Labour profile already exists for this user", 409);
    }
  } else {
    if (!labourName) {
      throw new AppError("labourName is required when userId is not provided", 400);
    }
    const username = employeeCode.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await pool
      .request()
      .input("username", sql.VarChar, username)
      .input("password_hash", sql.VarChar, passwordHash)
      .input("role_id", sql.Int, LABOUR_ROLE_ID)
      .query(
        `INSERT INTO users (username, password_hash, role_id, is_active)
         OUTPUT INSERTED.user_id VALUES (@username, @password_hash, @role_id, 1)`
      );
    userIdNum = userResult.recordset[0].user_id;
  }

  const displayName =
    labourName ||
    (
      await pool
        .request()
        .input("user_id", sql.Int, userIdNum)
        .query("SELECT username FROM users WHERE user_id = @user_id")
    ).recordset[0].username;

  const request = pool
    .request()
    .input("employee_id", sql.VarChar, employeeCode.trim())
    .input("labour_name", sql.VarChar, displayName.trim())
    .input("user_id", sql.Int, userIdNum)
    .input("contractor_name", sql.VarChar, contractorName || null)
    .input("department_id", sql.Int, deptId)
    .input("joining_date", sql.Date, joiningDate || new Date())
    .input("mobile_number", sql.VarChar, phone || null)
    .input("address", sql.VarChar(sql.MAX), address || null);

  let insertSql = `INSERT INTO labour_profiles
    (employee_id, labour_name, user_id, contractor_name, department_id,
     assigned_hod_id, joining_date, mobile_number, address, status)
    OUTPUT INSERTED.labour_id
    VALUES (@employee_id, @labour_name, @user_id, @contractor_name, @department_id,
            @assigned_hod_id, @joining_date, @mobile_number, @address, 'Active')`;

  if (hodIdNum) {
    request.input("assigned_hod_id", sql.Int, hodIdNum);
  } else {
    insertSql = insertSql.replace("@assigned_hod_id", "NULL");
  }

  const labourResult = await request.query(insertSql);
  const labourId = labourResult.recordset[0].labour_id;

  if (hodIdNum && data.hodMobile) {
    await hodService.updateHodMobile(hodIdNum, data.hodMobile);
  }

  if (data.photoUrl) {
    try {
      const downloadedFile = await downloadPhoto(data.photoUrl, labourId);
      if (downloadedFile) {
        await saveDownloadedPhoto(labourId, downloadedFile);
      }
    } catch (err) {
      console.error(`Failed to download photo for labour ${labourId}:`, err.message);
    }
  }

  return getLabourById(labourId);
};

const getLabourById = async (id) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("labour_id", sql.Int, id)
    .query(`${baseSelect} WHERE lp.labour_id = @labour_id`);

  if (result.recordset.length === 0) {
    throw new AppError("Labour profile not found", 404);
  }
  return mapLabour(result.recordset[0]);
};

const getAllLabourProfiles = async (actor) => {
  const pool = getPool();
  const role = String(actor.role).toUpperCase();

  if (role === "ADMIN") {
    const result = await pool.request().query(`${baseSelect} ORDER BY lp.labour_name`);
    return result.recordset.map(mapLabour);
  }

  if (role === "HOD") {
    const deptId = await getHodDepartmentId(actor.id);
    if (!deptId) return [];
    const result = await pool
      .request()
      .input("department_id", sql.Int, deptId)
      .query(
        `${baseSelect} WHERE lp.department_id = @department_id ORDER BY lp.labour_name`
      );
    return result.recordset.map(mapLabour);
  }

  if (role === "LABOUR") {
    const row = await getLabourByUserId(actor.id);
    return row ? [mapLabour(row)] : [];
  }

  return [];
};

const assertAccess = async (actor, labourId, action) => {
  const labour = await getLabourById(labourId);
  const role = String(actor.role).toUpperCase();

  if (role === "ADMIN") return labour;

  if (role === "HOD" && action === "view") {
    const deptId = await getHodDepartmentId(actor.id);
    if (deptId === labour.departmentID) return labour;
    throw new AppError("Not authorized to view this labour profile", 403);
  }

  if (role === "LABOUR" && labour.userID === actor.id) {
    if (action === "view" || action === "update") return labour;
  }

  throw new AppError("Not authorized", 403);
};

const updateLabourProfile = async (id, data, actor) => {
  const labour = await assertAccess(actor, id, "update");
  const role = String(actor.role).toUpperCase();
  const pool = getPool();

  const isAdmin = role === "ADMIN";
  const isSelf = role === "LABOUR" && labour.userID === actor.id;

  if (!isAdmin && !isSelf) {
    throw new AppError("Not authorized to update this profile", 403);
  }

  const phone = data.phone ?? labour.phone;
  const address = data.address ?? labour.address;
  const joiningDate = data.joiningDate ?? labour.joiningDate;

  let departmentId = labour.departmentID;
  let hodId = labour.hodID;
  let labourName = labour.labourName;
  let contractorName = labour.contractorName;
  let employeeCode = labour.employeeCode;

  if (isAdmin) {
    if (data.departmentId) {
      departmentId = parseInt(data.departmentId, 10);
      await departmentService.getDepartmentById(departmentId);
    }
    if (data.hodId !== undefined) {
      if (data.hodId === null || data.hodId === "") {
        hodId = null;
      } else {
        hodId = parseInt(data.hodId, 10);
        const hod = await hodService.getHodById(hodId);
        if (hod.departmentID !== departmentId) {
          throw new AppError("HOD does not belong to the department", 400);
        }
      }
    }
    if (data.hodName && !data.hodId) {
      const hod = await hodService.findOrCreateHod(data.hodName.trim(), departmentId, data.hodMobile);
      hodId = hod.hod_id;
    }
    if (data.labourName) labourName = data.labourName;
    if (data.contractorName !== undefined) contractorName = data.contractorName;
    if (data.employeeCode) {
      const dup = await pool
        .request()
        .input("employee_id", sql.VarChar, data.employeeCode.trim())
        .input("labour_id", sql.Int, id)
        .query(
          "SELECT labour_id FROM labour_profiles WHERE employee_id = @employee_id AND labour_id <> @labour_id"
        );
      if (dup.recordset.length > 0) throw new AppError("Employee code already exists", 409);
      employeeCode = data.employeeCode.trim();
    }
  }

  await pool
    .request()
    .input("labour_id", sql.Int, id)
    .input("employee_id", sql.VarChar, employeeCode)
    .input("labour_name", sql.VarChar, labourName)
    .input("contractor_name", sql.VarChar, contractorName)
    .input("department_id", sql.Int, departmentId)
    .input("assigned_hod_id", sql.Int, hodId)
    .input("joining_date", sql.Date, joiningDate)
    .input("mobile_number", sql.VarChar, phone)
    .input("address", sql.VarChar(sql.MAX), address)
    .query(
      `UPDATE labour_profiles SET
         employee_id = @employee_id, labour_name = @labour_name,
         contractor_name = @contractor_name, department_id = @department_id,
         assigned_hod_id = @assigned_hod_id, joining_date = @joining_date,
         mobile_number = @mobile_number, address = @address
       WHERE labour_id = @labour_id`
    );

  if (hodId && data.hodMobile) {
    await hodService.updateHodMobile(hodId, data.hodMobile);
  }

  if (data.photoUrl) {
    try {
      const downloadedFile = await downloadPhoto(data.photoUrl, id);
      if (downloadedFile) {
        await saveDownloadedPhoto(id, downloadedFile);
      }
    } catch (err) {
      console.error(`Failed to download photo for labour ${id}:`, err.message);
    }
  }

  return getLabourById(id);
};

const deactivateLabourProfile = async (id) => {
  await getLabourById(id);
  await getPool()
    .request()
    .input("labour_id", sql.Int, id)
    .query(
      `UPDATE labour_profiles SET status = 'Inactive' WHERE labour_id = @labour_id`
    );
  return getLabourById(id);
};

const getLabourByCode = async (code) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("employee_id", sql.VarChar, code.trim())
    .query(`${baseSelect} WHERE lp.employee_id = @employee_id`);

  if (result.recordset.length === 0) {
    throw new AppError("Labour profile not found", 404);
  }
  return mapLabour(result.recordset[0]);
};

const bulkCreateLabourProfiles = async (laboursArray) => {
  const results = [];
  const errors = [];

  for (const item of laboursArray) {
    try {
      const res = await createLabourProfile(item);
      results.push(res);
    } catch (e) {
      errors.push({
        employeeCode: item.employeeCode || "N/A",
        labourName: item.labourName || "N/A",
        error: e.message || "Unknown error",
      });
    }
  }

  return {
    successCount: results.length,
    errorCount: errors.length,
    results,
    errors,
  };
};

const downloadPhoto = async (urlStr, labourId, redirectCount = 0) => {
  if (!urlStr) return null;
  let cleanUrl = urlStr.trim();

  // Auto-convert Google Drive sharing links to direct download links
  if (cleanUrl.includes("drive.google.com/file/d/")) {
    const parts = cleanUrl.split("drive.google.com/file/d/");
    if (parts[1]) {
      const fileId = parts[1].split("/")[0].split("?")[0].split("&")[0];
      cleanUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  } else if (cleanUrl.includes("drive.google.com/open?id=")) {
    const parts = cleanUrl.split("drive.google.com/open?id=");
    if (parts[1]) {
      const fileId = parts[1].split("&")[0];
      cleanUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }

  if (!cleanUrl.startsWith("http")) return null;

  if (redirectCount > 5) {
    throw new Error("Too many redirects");
  }

  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(cleanUrl);
      const client = parsedUrl.protocol === "https:" ? https : http;

      const options = {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        rejectUnauthorized: false
      };

      client.get(cleanUrl, options, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, cleanUrl).toString();
          return resolve(downloadPhoto(redirectUrl, labourId, redirectCount + 1));
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`Failed to download photo: Status Code ${response.statusCode}`));
        }

        const contentType = response.headers["content-type"];
        if (contentType && !contentType.startsWith("image/")) {
          return reject(new Error(`Invalid content-type: ${contentType}`));
        }

        let ext = ".jpg";
        if (contentType) {
          const parts = contentType.split("/");
          if (parts[1]) ext = `.${parts[1].split("+")[0]}`;
        } else {
          const extname = path.extname(parsedUrl.pathname);
          if (extname) ext = extname;
        }

        const filename = `${Date.now()}_downloaded_${labourId}${ext}`;
        const destPath = path.join(__dirname, "../uploads", filename);

        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream.close();
          resolve({
            filename,
            originalname: path.basename(parsedUrl.pathname) || "photo.jpg",
            path: destPath,
          });
        });

        fileStream.on("error", (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on("error", reject);
    } catch (e) {
      reject(e);
    }
  });
};

const saveDownloadedPhoto = async (labourId, file) => {
  const pool = getPool();
  const relativePath = `uploads/${file.filename}`;

  await pool
    .request()
    .input("labour_id", sql.Int, labourId)
    .input("document_type", sql.VarChar, "photo")
    .input("file_name", sql.NVarChar, file.originalname)
    .input("file_path", sql.NVarChar, relativePath)
    .input("uploaded_by", sql.Int, null)
    .query(
      `INSERT INTO labour_documents (labour_id, document_type, file_name, file_path, uploaded_by)
       VALUES (@labour_id, @document_type, @file_name, @file_path, @uploaded_by)`
    );

  await pool
    .request()
    .input("labour_id", sql.Int, labourId)
    .input("photo_url", sql.VarChar, relativePath)
    .query("UPDATE labour_profiles SET photo_url = @photo_url WHERE labour_id = @labour_id");
};

const bulkUploadPhotosService = async (zipFilePath, uploadedBy) => {
  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();

  let successCount = 0;
  let errorCount = 0;
  const results = [];
  const errors = [];

  const pool = getPool();

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName;
    const baseName = path.basename(entryName);
    
    // Ignore hidden or meta files
    if (baseName.startsWith(".") || baseName.startsWith("__")) continue;

    // Check if file is an image
    const ext = path.extname(baseName).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      errors.push({
        fileName: baseName,
        error: "Invalid file type. Only JPG, PNG, WEBP are supported."
      });
      errorCount++;
      continue;
    }

    // Extract employeeCode (filename without extension)
    const employeeCode = path.parse(baseName).name.trim();

    try {
      // Find employee by employeeCode
      const queryResult = await pool
        .request()
        .input("employee_code", sql.VarChar, employeeCode)
        .query("SELECT labour_id, labour_name FROM labour_profiles WHERE LOWER(employee_id) = LOWER(@employee_code)");

      if (queryResult.recordset.length === 0) {
        errors.push({
          fileName: baseName,
          error: `No employee found with ID: ${employeeCode}`
        });
        errorCount++;
        continue;
      }

      const labour = queryResult.recordset[0];
      const labourId = labour.labour_id;

      // Extract image content
      const buffer = entry.getData();
      const filename = `${Date.now()}_zip_${labourId}${ext}`;
      const destPath = path.join(__dirname, "../uploads", filename);

      // Save buffer to file
      fs.writeFileSync(destPath, buffer);

      const relativePath = `uploads/${filename}`;

      // Insert into labour_documents
      await pool
        .request()
        .input("labour_id", sql.Int, labourId)
        .input("document_type", sql.VarChar, "photo")
        .input("file_name", sql.NVarChar, baseName)
        .input("file_path", sql.NVarChar, relativePath)
        .input("uploaded_by", sql.Int, uploadedBy)
        .query(
          `INSERT INTO labour_documents (labour_id, document_type, file_name, file_path, uploaded_by)
           VALUES (@labour_id, @document_type, @file_name, @file_path, @uploaded_by)`
        );

      // Update labour_profiles
      await pool
        .request()
        .input("labour_id", sql.Int, labourId)
        .input("photo_url", sql.VarChar, relativePath)
        .query("UPDATE labour_profiles SET photo_url = @photo_url WHERE labour_id = @labour_id");

      results.push({
        employeeCode,
        labourName: labour.labour_name,
        fileName: baseName,
      });
      successCount++;
    } catch (err) {
      errors.push({
        fileName: baseName,
        error: err.message || "Failed to process photo"
      });
      errorCount++;
    }
  }

  // Delete uploaded zip file after processing
  try {
    fs.unlinkSync(zipFilePath);
  } catch (_) {}

  return {
    successCount,
    errorCount,
    results,
    errors,
  };
};

module.exports = {
  createLabourProfile,
  getAllLabourProfiles,
  getLabourById,
  getLabourByCode,
  assertAccess,
  updateLabourProfile,
  deactivateLabourProfile,
  mapLabour,
  bulkCreateLabourProfiles,
  bulkUploadPhotosService,
};

