const path = require("path");
const { sql, getPool } = require("../config/db");
const { AppError } = require("./departmentService");

const ALLOWED_TYPES = ["photo", "id_proof", "document", "medical"];

const saveLabourDocument = async (labourId, documentType, file, uploadedBy) => {
  if (!ALLOWED_TYPES.includes(documentType)) {
    throw new AppError("Invalid document type", 400);
  }

  const labour = await getPool()
    .request()
    .input("labour_id", sql.Int, labourId)
    .query("SELECT labour_id FROM labour_profiles WHERE labour_id = @labour_id");

  if (labour.recordset.length === 0) {
    throw new AppError("Labour not found", 404);
  }

  const relativePath = `uploads/${file.filename}`;

  const result = await getPool()
    .request()
    .input("labour_id", sql.Int, labourId)
    .input("document_type", sql.VarChar, documentType)
    .input("file_name", sql.NVarChar, file.originalname)
    .input("file_path", sql.NVarChar, relativePath.replace(/\\/g, "/"))
    .input("uploaded_by", sql.Int, uploadedBy)
    .query(
      `INSERT INTO labour_documents (labour_id, document_type, file_name, file_path, uploaded_by)
       OUTPUT INSERTED.document_id, INSERTED.file_name, INSERTED.file_path, INSERTED.document_type
       VALUES (@labour_id, @document_type, @file_name, @file_path, @uploaded_by)`
    );

  if (documentType === "photo") {
    try {
      await getPool()
        .request()
        .input("labour_id", sql.Int, labourId)
        .input("photo_url", sql.VarChar, relativePath)
        .query("UPDATE labour_profiles SET photo_url = @photo_url WHERE labour_id = @labour_id");
    } catch (_) {
      /* photo_url column may not exist on older schemas */
    }
  }

  const row = result.recordset[0];
  return {
    documentID: row.document_id,
    documentType: row.document_type,
    fileName: row.file_name,
    filePath: row.file_path,
  };
};

const getLabourDocuments = async (labourId) => {
  const result = await getPool()
    .request()
    .input("labour_id", sql.Int, labourId)
    .query(
      `SELECT document_id, document_type, file_name, file_path, created_at
       FROM labour_documents WHERE labour_id = @labour_id ORDER BY created_at DESC`
    );
  return result.recordset.map((r) => ({
    documentID: r.document_id,
    documentType: r.document_type,
    fileName: r.file_name,
    filePath: r.file_path,
    createdAt: r.created_at,
  }));
};

module.exports = { saveLabourDocument, getLabourDocuments, ALLOWED_TYPES };
