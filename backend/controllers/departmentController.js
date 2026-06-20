const departmentService = require("../services/departmentService");
const hodService = require("../services/hodService");
const { AppError } = require("../services/departmentService");
const { isDbConnected } = require("../config/db");
const { logActivity, getClientIp } = require("../services/activityLogService");

const dbUnavailable = (res) =>
  res.status(503).json({ success: false, message: "Database not connected" });

const handleError = (res, error) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  console.error(error);
  return res.status(500).json({ success: false, message: "Internal server error" });
};

const getDepartmentsAdmin = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await departmentService.getDepartmentsAdminView();
    res.json({ success: true, data });
  } catch (error) {
    handleError(res, error);
  }
};

const getAllDepartments = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const departments = await departmentService.getAllDepartments();
    res.json(departments);
  } catch (error) {
    handleError(res, error);
  }
};

const getDepartmentById = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const department = await departmentService.getDepartmentById(
      parseInt(req.params.id, 10)
    );
    const hods = await hodService.getHodsByDepartment(parseInt(req.params.id, 10));
    res.json({ success: true, data: { ...department, hods } });
  } catch (error) {
    handleError(res, error);
  }
};

const addDepartmentInline = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const { departmentName, description } = req.body;
    const dept = await departmentService.findOrCreateDepartment(
      departmentName,
      description
    );
    if (dept.created) {
      await logActivity({
        userId: req.user.id,
        action: "Admin created department",
        entity: "departments",
        entityId: dept.department_id,
        ipAddress: getClientIp(req),
      });
    }
    res.status(dept.created ? 201 : 200).json({
      success: true,
      message: dept.created ? "Department created" : "Department already exists",
      data: {
        departmentID: dept.department_id,
        departmentName: dept.department_name,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

const assignHod = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const departmentId = parseInt(req.params.id, 10);
    const { hodName, mobileNumber, hodId } = req.body;

    const { createNotification, notifyHodUserId } = require("../services/notificationService");
    const dept = await departmentService.getDepartmentById(departmentId);

    if (hodId) {
      await hodService.assignHodToDepartment(hodId, departmentId);
      await logActivity({
        userId: req.user.id,
        action: "Admin assigned HOD to department",
        entity: "departments",
        entityId: departmentId,
        ipAddress: getClientIp(req),
      });

      // Call notification for existing HOD
      const hodUserId = await notifyHodUserId(hodId);
      if (hodUserId && dept) {
        await createNotification({
          userId: hodUserId,
          title: "Department Assigned",
          message: `You have been assigned as the HOD of the department: ${dept.departmentName}`,
          type: "info",
        });
      }

      return res.json({ success: true, message: "HOD assigned to department" });
    }

    if (!hodName) {
      return res.status(400).json({ success: false, message: "hodName or hodId is required" });
    }

    const hod = await hodService.createAndAssignHod(
      departmentId,
      hodName,
      mobileNumber
    );

    await logActivity({
      userId: req.user.id,
      action: hod.created ? "Admin created and assigned HOD" : "Admin assigned HOD",
      entity: "hod_profiles",
      entityId: hod.hod_id,
      ipAddress: getClientIp(req),
    });

    // Call notification for newly created/assigned HOD
    const hodUserId = await notifyHodUserId(hod.hod_id);
    if (hodUserId && dept) {
      await createNotification({
        userId: hodUserId,
        title: "Department Assigned",
        message: `You have been assigned as the HOD of the department: ${dept.departmentName}`,
        type: "info",
      });
    }

    res.status(201).json({
      success: true,
      message: hod.created ? "HOD created and assigned" : "HOD assigned",
      data: { hodID: hod.hod_id, hodName: hod.hod_name },
    });
  } catch (error) {
    handleError(res, error);
  }
};

const setPrimaryHodHandler = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const data = await departmentService.setPrimaryHod(
      parseInt(req.params.id, 10),
      parseInt(req.body.hodId, 10)
    );
    res.json({ success: true, message: "Primary HOD set for department", data });
  } catch (error) {
    handleError(res, error);
  }
};

const getDepartmentHods = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const hods = await hodService.getHodsByDepartment(parseInt(req.params.id, 10));
    res.json({ success: true, data: hods });
  } catch (error) {
    handleError(res, error);
  }
};

const updateDepartment = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const { departmentName, description } = req.body;
    await departmentService.updateDepartment(
      parseInt(req.params.id, 10),
      departmentName,
      description
    );
    res.json({ success: true, message: "Department updated" });
  } catch (error) {
    handleError(res, error);
  }
};

const deleteDepartment = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    await departmentService.deleteDepartment(parseInt(req.params.id, 10));
    res.json({ success: true, message: "Department deleted" });
  } catch (error) {
    handleError(res, error);
  }
};

const addDepartment = async (req, res) => {
  if (!isDbConnected()) return dbUnavailable(res);
  try {
    const { departmentName, description } = req.body;
    const existing = await departmentService.findByName(departmentName);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Department name already exists",
      });
    }

    const dept = await departmentService.findOrCreateDepartment(
      departmentName,
      description
    );
    
    await logActivity({
      userId: req.user.id,
      action: "Admin created department",
      entity: "departments",
      entityId: dept.department_id,
      ipAddress: getClientIp(req),
    });

    res.status(201).json({
      success: true,
      message: "Department created",
      data: {
        departmentID: dept.department_id,
        departmentName: dept.department_name,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getDepartmentsAdmin,
  getAllDepartments,
  getDepartmentById,
  addDepartmentInline,
  addDepartment,
  assignHod,
  getDepartmentHods,
  setPrimaryHod: setPrimaryHodHandler,
  updateDepartment,
  deleteDepartment,
};
