const { sql, getPool } = require("../config/db");
const hodService = require("./hodService");
const { AppError } = require("./departmentService");

const mapRequest = (row) => ({
  requestID: row.request_id,
  labourID: row.labour_id,
  labourName: row.labour_name,
  employeeCode: row.employee_id,
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
});

const baseSelect = `
  SELECT r.request_id, r.labour_id, lp.labour_name, lp.employee_id,
         d.department_name, r.hod_id, h.hod_name,
         r.request_date, r.out_time, r.return_time, r.reason, r.status,
         r.hod_remarks, r.approved_by, r.approved_at, r.rejected_by, r.rejected_at,
         ISNULL(r.is_urgent, 0) AS is_urgent, r.created_at
  FROM outing_requests r
  INNER JOIN labour_profiles lp ON r.labour_id = lp.labour_id
  INNER JOIN departments d ON lp.department_id = d.department_id
  INNER JOIN hod_profiles h ON r.hod_id = h.hod_id
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
  const labour = await getLabourByUserId(actor.id);
  if (!labour) throw new AppError("Labour profile not found for this user", 404);
  if (labour.status !== "Active") {
    throw new AppError("Inactive labour cannot create outing requests", 403);
  }
  if (!labour.assigned_hod_id) {
    throw new AppError("No HOD assigned. Ask admin to assign a HOD first.", 400);
  }

  const { requestDate, outTime, returnTime, reason, isUrgent } = data;
  if (!requestDate || !outTime || !reason) {
    throw new AppError("requestDate, outTime, and reason are required", 400);
  }

  const urgent = isUrgent === true || isUrgent === 1 || isUrgent === "true";

  const pool = getPool();
  let result;
  try {
    result = await pool
      .request()
      .input("labour_id", sql.Int, labour.labour_id)
      .input("hod_id", sql.Int, labour.assigned_hod_id)
      .input("request_date", sql.Date, requestDate)
      .input("out_time", sql.VarChar, outTime)
      .input("return_time", sql.VarChar, returnTime || null)
      .input("reason", sql.VarChar(sql.MAX), reason)
      .input("is_urgent", sql.Bit, urgent ? 1 : 0)
      .query(
        `INSERT INTO outing_requests
         (labour_id, hod_id, request_date, out_time, return_time, reason, status, is_urgent)
         OUTPUT INSERTED.request_id
         VALUES (@labour_id, @hod_id, @request_date, @out_time, @return_time, @reason, 'Pending', @is_urgent)`
      );
  } catch (err) {
    if (!String(err.message).includes("is_urgent")) throw err;
    result = await pool
      .request()
      .input("labour_id", sql.Int, labour.labour_id)
      .input("hod_id", sql.Int, labour.assigned_hod_id)
      .input("request_date", sql.Date, requestDate)
      .input("out_time", sql.VarChar, outTime)
      .input("return_time", sql.VarChar, returnTime || null)
      .input("reason", sql.VarChar(sql.MAX), reason)
      .query(
        `INSERT INTO outing_requests
         (labour_id, hod_id, request_date, out_time, return_time, reason, status)
         OUTPUT INSERTED.request_id
         VALUES (@labour_id, @hod_id, @request_date, @out_time, @return_time, @reason, 'Pending')`
      );
  }

  const requestId = result.recordset[0].request_id;
  await recordApproval(requestId, null, "Pending", actor.id, "Request created");
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
