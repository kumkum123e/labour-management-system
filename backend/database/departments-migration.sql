-- Run on LabourManagementSystem if columns are missing

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'departments' AND COLUMN_NAME = 'description'
)
BEGIN
  ALTER TABLE departments ADD description VARCHAR(255) NULL;
END
GO

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'departments' AND COLUMN_NAME = 'is_active'
)
BEGIN
  ALTER TABLE departments ADD is_active BIT NOT NULL DEFAULT 1;
END
GO
