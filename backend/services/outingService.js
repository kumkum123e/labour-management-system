const { sql, getPool } = require("../config/db");
const hodService = require("./hodService");
const { AppError } = require("./departmentService");

const mapRequest = (row) => ({
  requestID: row.request_id,
  labourID: row.labour_id,
  securityID: row.security_id,
  labourName: row.labour_name,
  employeeCode: row.employee_id,
  contractorName: row.contractor_name,
  departmentName: row.department_name,
  hodID: row.hod_id,
  hodName: row.hod_name,
  requestDate: row.request_date,
  outTime: row.out_time,
  returnTime: row.return_time,
  reason: row.reason,
  status: row.status,
  remarks: row.hod_remarks,
  hodRemarks: row.hod_remarks,
  approvedBy: row.approved_by,
  approvedAt: row.approved_at,
  rejectedBy: row.rejected_by,
  rejectedAt: row.rejected_at,
  isUrgent: row.is_urgent === true || row.is_urgent === 1,
  createdAt: row.created_at,
  securityUserID: row.security_user_id,
  securityUsername: row.security_username,
  securitySignature: row.security_signature,
});

const baseSelect = `
  SELECT r.request_id, r.labour_id, r.security_id,
         COALESCE(lp.labour_name, sp.security_name) AS labour_name,
         COALESCE(lp.employee_id, sp.security_code) AS employee_id,
         lp.contractor_name,
         d.department_name, r.hod_id, h.hod_name,
         r.request_date, r.out_time, r.return_time, r.reason, r.status,
         r.hod_remarks, r.approved_by, r.approved_at, r.rejected_by, r.rejected_at,
         ISNULL(r.is_urgent, 0) AS is_urgent, r.created_at,
         r.security_user_id, su.username AS security_username, r.security_signature
  FROM outing_requests r
  LEFT JOIN labour_profiles lp ON r.labour_id = lp.labour_id
  LEFT JOIN security_profiles sp ON r.security_id = sp.security_id
  LEFT JOIN departments d ON (lp.department_id = d.department_id OR sp.department_id = d.department_id)
  INNER JOIN hod_profiles h ON r.hod_id = h.hod_id
  LEFT JOIN users su ON r.security_user_id = su.user_id
`;

const getLabourByUserId = async (userId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("user_id", sql.Int, userId)
    .query(
      `SELECT labour_id, labour_name, employee_id, department_id, assigned_hod_id, status
       FROM labour_profiles WHERE user_id = @user_id`
    );
  return result.recordset[0] || null;
};

const recordApproval = async (requestId, previousStatus, newStatus, changedBy, remarks) => {
  await getPool()
    .request()
    .input("request_id", sql.Int, requestId)
    .input("previous_status", sql.VarChar, previousStatus)
    .input("new_status", sql.VarChar, newStatus)
    .input("changed_by", sql.Int, changedBy)
    .input("remarks", sql.VarChar(sql.MAX), remarks || null)
    .query(
      `INSERT INTO request_approvals (request_id, previous_status, new_status, changed_by, remarks)
       VALUES (@request_id, @previous_status, @new_status, @changed_by, @remarks)`
    );
};

const createOutingRequest = async (data, actor) => {
  const role = String(actor.role).trim().toUpperCase();
  let labour = null;
  let securityProfile = null;
  let isSecurityOuting = false;
  let securityUserId = null;
  let securitySignature = null;

  if (role === "SECURITY" || role === "ADMIN") {
    if (!data.employeeCode) {
      throw new AppError("employeeCode is required", 400);
    }
    const pool = getPool();
    const result = await pool
      .request()
      .input("employee_id", sql.VarChar, data.employeeCode.trim())
      .query(`SELECT lp.labour_id, lp.labour_name, lp.employee_id, lp.department_id, lp.assigned_hod_id, lp.status
              FROM labour_profiles lp WHERE lp.employee_id = @employee_id`);
    labour = result.recordset[0];
    
    if (!labour) {
      const secResult = await pool
        .request()
        .input("security_code", sql.VarChar, data.employeeCode.trim())
        .query(`SELECT sp.security_id, sp.security_name, sp.security_code, sp.department_id, sp.assigned_hod_id
                FROM security_profiles sp WHERE sp.security_code = @security_code`);
      securityProfile = secResult.recordset[0];
      if (!securityProfile) {
        throw new AppError("Profile not found for the given Code/ID", 404);
      }
      isSecurityOuting = true;
    }

    if (data.assignedHodId) {
      const newHodId = parseInt(data.assignedHodId, 10);
      if (isSecurityOuting) {
        if (securityProfile.assigned_hod_id !== newHodId) {
          await pool
            .request()
            .input("assigned_hod_id", sql.Int, newHodId)
            .input("security_id", sql.Int, securityProfile.security_id)
            .query(`UPDATE security_profiles SET assigned_hod_id = @assigned_hod_id WHERE security_id = @security_id`);
          securityProfile.assigned_hod_id = newHodId;
        }
      } else {
        if (labour.assigned_hod_id !== newHodId) {
          await pool
            .request()
            .input("assigned_hod_id", sql.Int, newHodId)
            .input("labour_id", sql.Int, labour.labour_id)
            .query(`UPDATE labour_profiles SET assigned_hod_id = @assigned_hod_id WHERE labour_id = @labour_id`);
          labour.assigned_hod_id = newHodId;
        }
      }
    }
    
    securityUserId = actor.id;
    securitySignature = data.securitySignature || null;
  } else {
    labour = await getLabourByUserId(actor.id);
    if (!labour) throw new AppError("Labour profile not found for this user", 404);
  }

  if (!isSecurityOuting && labour.status !== "Active") {
    throw new AppError("Inactive labour cannot have outing requests", 403);
  }

  const activeHodId = isSecurityOuting ? securityProfile.assigned_hod_id : labour.assigned_hod_id;
  if (!activeHodId) {
    throw new AppError("No HOD assigned. Assign HOD first.", 400);
  }

  const { requestDate, outTime, returnTime, reason, isUrgent } = data;
  if (!requestDate || !outTime || !reason) {
    throw new AppError("requestDate, outTime, and reason are required", 400);
  }

  const urgent = isUrgent === true || isUrgent === 1 || isUrgent === "true";

  const pool = getPool();
  let result;
  
  result = await pool
    .request()
    .input("labour_id", sql.Int, isSecurityOuting ? null : labour.labour_id)
    .input("security_id", sql.Int, isSecurityOuting ? securityProfile.security_id : null)
    .input("hod_id", sql.Int, activeHodId)
    .input("request_date", sql.Date, requestDate)
    .input("out_time", sql.VarChar, outTime)
    .input("return_time", sql.VarChar, returnTime || null)
    .input("reason", sql.VarChar(sql.MAX), reason)
    .input("is_urgent", sql.Bit, urgent ? 1 : 0)
    .input("security_user_id", sql.Int, securityUserId)
    .input("security_signature", sql.VarChar(sql.MAX), securitySignature)
    .query(
      `INSERT INTO outing_requests
       (labour_id, security_id, hod_id, request_date, out_time, return_time, reason, status, is_urgent, security_user_id, security_signature)
       OUTPUT INSERTED.request_id
       VALUES (@labour_id, @security_id, @hod_id, @request_date, @out_time, @return_time, @reason, 'Pending', @is_urgent, @security_user_id, @security_signature)`
    );

  const requestId = result.recordset[0].request_id;
  let creatorText = "Request created";
  if (role === "SECURITY") {
    creatorText = "Request created by Security";
  } else if (role === "ADMIN") {
    creatorText = "Request created by Admin";
  }
  await recordApproval(requestId, null, "Pending", actor.id, creatorText);
  return getOutingRequestById(requestId);
};

const getOutingRequestById = async (id) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("request_id", sql.Int, id)
    .query(`${baseSelect} WHERE r.request_id = @request_id`);

  if (result.recordset.length === 0) {
    throw new AppError("Outing request not found", 404);
  }
  return mapRequest(result.recordset[0]);
};

const getOutingRequests = async (actor) => {
  const pool = getPool();
  const role = String(actor.role).toUpperCase();

  if (role === "ADMIN") {
    const result = await pool.request().query(`${baseSelect} ORDER BY r.created_at DESC`);
    return result.recordset.map(mapRequest);
  }

  if (role === "HOD") {
    const hod = await hodService.getHodByUserId(actor.id);
    if (!hod) return [];
    const result = await pool
      .request()
      .input("hod_id", sql.Int, hod.hodID)
      .query(`${baseSelect} WHERE r.hod_id = @hod_id ORDER BY r.created_at DESC`);
    return result.recordset.map(mapRequest);
  }

  if (role === "LABOUR") {
    const labour = await getLabourByUserId(actor.id);
    if (!labour) return [];
    const result = await pool
      .request()
      .input("labour_id", sql.Int, labour.labour_id)
      .query(`${baseSelect} WHERE r.labour_id = @labour_id ORDER BY r.created_at DESC`);
    return result.recordset.map(mapRequest);
  }

  if (role === "SECURITY") {
    const result = await pool
      .request()
      .input("security_user_id", sql.Int, actor.id)
      .query(`${baseSelect} WHERE r.security_user_id = @security_user_id ORDER BY r.created_at DESC`);
    return result.recordset.map(mapRequest);
  }

  return [];
};

const assertCanView = async (actor, requestId) => {
  const request = await getOutingRequestById(requestId);
  const role = String(actor.role).toUpperCase();

  if (role === "ADMIN") return request;

  if (role === "HOD") {
    const hod = await hodService.getHodByUserId(actor.id);
    if (hod && Number(hod.hodID) === Number(request.hodID)) return request;
    throw new AppError("Not authorized to view this request", 403);
  }

  if (role === "LABOUR") {
    const labour = await getLabourByUserId(actor.id);
    if (labour && Number(labour.labour_id) === Number(request.labourID)) return request;
    throw new AppError("Not authorized to view this request", 403);
  }

  if (role === "SECURITY") {
    if (Number(request.securityUserID) === Number(actor.id)) return request;
    throw new AppError("Not authorized to view this request", 403);
  }

  throw new AppError("Not authorized", 403);
};

const approveOutingRequest = async (requestId, actor, remarks) => {
  const request = await assertCanView(actor, requestId);
  const role = String(actor.role).toUpperCase();

  if (role !== "HOD" && role !== "ADMIN") {
    throw new AppError("Only HOD or Admin can approve", 403);
  }

  if (request.status !== "Pending") {
    throw new AppError(`Cannot approve request with status '${request.status}'`, 400);
  }

  if (role === "HOD") {
    const hod = await hodService.getHodByUserId(actor.id);
    if (!hod || Number(hod.hodID) !== Number(request.hodID)) {
      throw new AppError("This request is not assigned to you", 403);
    }
  }

  await getPool()
    .request()
    .input("request_id", sql.Int, requestId)
    .input("hod_remarks", sql.VarChar(sql.MAX), remarks || null)
    .input("approved_by", sql.Int, actor.id)
    .query(
      `UPDATE outing_requests SET status = 'Approved', hod_remarks = @hod_remarks,
       approved_at = GETDATE(), approved_by = @approved_by,
       rejected_at = NULL, rejected_by = NULL WHERE request_id = @request_id`
    );

  await recordApproval(requestId, "Pending", "Approved", actor.id, remarks);
  return getOutingRequestById(requestId);
};

const rejectOutingRequest = async (requestId, actor, remarks) => {
  const request = await assertCanView(actor, requestId);
  const role = String(actor.role).toUpperCase();

  if (role !== "HOD" && role !== "ADMIN") {
    throw new AppError("Only HOD or Admin can reject", 403);
  }

  if (request.status !== "Pending") {
    throw new AppError(`Cannot reject request with status '${request.status}'`, 400);
  }

  if (role === "HOD") {
    const hod = await hodService.getHodByUserId(actor.id);
    if (!hod || Number(hod.hodID) !== Number(request.hodID)) {
      throw new AppError("This request is not assigned to you", 403);
    }
  }

  if (!remarks) {
    throw new AppError("Remarks are required when rejecting", 400);
  }

  await getPool()
    .request()
    .input("request_id", sql.Int, requestId)
    .input("hod_remarks", sql.VarChar(sql.MAX), remarks)
    .input("rejected_by", sql.Int, actor.id)
    .query(
      `UPDATE outing_requests SET status = 'Rejected', hod_remarks = @hod_remarks,
       rejected_at = GETDATE(), rejected_by = @rejected_by,
       approved_at = NULL, approved_by = NULL WHERE request_id = @request_id`
    );

  await recordApproval(requestId, "Pending", "Rejected", actor.id, remarks);
  return getOutingRequestById(requestId);
};

const getAdminMonitor = async () => {
  const pool = getPool();
  const summary = await pool.request().query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected
     FROM outing_requests`
  );

  const requests = await getOutingRequests({ role: "ADMIN", id: 0 });
  return { summary: summary.recordset[0], requests };
};

const getHodForRequest = async (hodId) => {
  const pool = getPool();
  const result = await pool
    .request()
    .input("hod_id", sql.Int, hodId)
    .query(`
      SELECT h.hod_id, h.hod_name, h.mobile_number, d.department_name
      FROM hod_profiles h
      LEFT JOIN departments d ON h.department_id = d.department_id
      WHERE h.hod_id = @hod_id
    `);
  
  if (result.recordset.length === 0) {
    throw new AppError("HOD not found", 404);
  }
  
  return {
    hodId: result.recordset[0].hod_id,
    hodName: result.recordset[0].hod_name,
    mobileNumber: result.recordset[0].mobile_number,
    departmentName: result.recordset[0].department_name,
  };
};

module.exports = {
  createOutingRequest,
  getOutingRequests,
  getOutingRequestById,
  assertCanView,
  approveOutingRequest,
  rejectOutingRequest,
  getAdminMonitor,
  getHodForRequest,
};
