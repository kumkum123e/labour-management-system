-- Phase 4: Primary HOD on department (optional lead HOD per department)

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'departments' AND COLUMN_NAME = 'primary_hod_id'
)
BEGIN
  ALTER TABLE departments ADD primary_hod_id INT NULL;
END
GO
