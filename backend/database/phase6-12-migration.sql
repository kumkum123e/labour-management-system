-- Phase 6-12 migrations

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'outing_requests' AND COLUMN_NAME = 'approved_by')
  ALTER TABLE outing_requests ADD approved_by INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'outing_requests' AND COLUMN_NAME = 'rejected_by')
  ALTER TABLE outing_requests ADD rejected_by INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'activity_logs' AND COLUMN_NAME = 'ip_address')
  ALTER TABLE activity_logs ADD ip_address VARCHAR(45) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'outing_requests' AND COLUMN_NAME = 'is_urgent')
  ALTER TABLE outing_requests ADD is_urgent BIT NOT NULL DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'labour_documents')
BEGIN
  CREATE TABLE labour_documents (
    document_id INT IDENTITY(1,1) PRIMARY KEY,
    labour_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name NVARCHAR(255) NOT NULL,
    file_path NVARCHAR(500) NOT NULL,
    uploaded_by INT NULL,
    created_at DATETIME DEFAULT GETDATE()
  );
END
GO
