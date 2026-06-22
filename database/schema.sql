-- Database Creation & Schema Script
-- Run this script inside your target SQL Server database

-- 1. Create Roles Table
CREATE TABLE roles (
    role_id INT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL
);

-- Seed Default Roles
INSERT INTO roles (role_id, role_name) VALUES 
(1, 'ADMIN'), 
(2, 'HOD'), 
(3, 'LABOUR');

-- 2. Create Users Table
CREATE TABLE users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT FOREIGN KEY REFERENCES roles(role_id),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

-- 3. Create Departments Table
CREATE TABLE departments (
    department_id INT IDENTITY(1,1) PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    primary_hod_id INT,
    is_active BIT DEFAULT 1
);

-- 4. Create HOD Profiles Table
CREATE TABLE hod_profiles (
    hod_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    department_id INT FOREIGN KEY REFERENCES departments(department_id),
    hod_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(15)
);

-- Associate Primary HOD in Departments
ALTER TABLE departments ADD CONSTRAINT FK_Departments_HOD 
FOREIGN KEY (primary_hod_id) REFERENCES hod_profiles(hod_id);

-- 5. Create Labour Profiles Table
CREATE TABLE labour_profiles (
    labour_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    department_id INT FOREIGN KEY REFERENCES departments(department_id),
    assigned_hod_id INT FOREIGN KEY REFERENCES hod_profiles(hod_id),
    employee_id VARCHAR(50) NOT NULL UNIQUE,
    labour_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(15),
    status VARCHAR(20) DEFAULT 'Active'
);

-- 6. Create Outing Requests Table
CREATE TABLE outing_requests (
    request_id INT IDENTITY(1,1) PRIMARY KEY,
    labour_id INT FOREIGN KEY REFERENCES labour_profiles(labour_id),
    security_id INT FOREIGN KEY REFERENCES security_profiles(security_id),
    hod_id INT FOREIGN KEY REFERENCES hod_profiles(hod_id),
    reason VARCHAR(255) NOT NULL,
    out_time DATETIME NOT NULL,
    in_time DATETIME,
    status VARCHAR(20) DEFAULT 'Pending',
    is_urgent BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE()
);

-- 7. Create Request Approvals Table
CREATE TABLE request_approvals (
    approval_id INT IDENTITY(1,1) PRIMARY KEY,
    request_id INT FOREIGN KEY REFERENCES outing_requests(request_id),
    approver_role VARCHAR(20) NOT NULL,
    approved_by INT FOREIGN KEY REFERENCES users(user_id),
    status VARCHAR(20) NOT NULL,
    remarks VARCHAR(255),
    approved_at DATETIME DEFAULT GETDATE()
);

-- 8. Create Notifications Table
CREATE TABLE notifications (
    notification_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    title VARCHAR(100) NOT NULL,
    message VARCHAR(255) NOT NULL,
    is_read BIT DEFAULT 0,
    type VARCHAR(20) DEFAULT 'info',
    created_at DATETIME DEFAULT GETDATE()
);

-- 9. Create Activity Logs Table
CREATE TABLE activity_logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(45),
    timestamp DATETIME DEFAULT GETDATE()
);

-- 10. Create Login Logs Table
CREATE TABLE login_logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(user_id),
    login_time DATETIME DEFAULT GETDATE(),
    ip_address VARCHAR(45),
    status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(255)
);

-- 11. Create Backups Table
CREATE TABLE backups (
    backup_id INT IDENTITY(1,1) PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    created_by INT FOREIGN KEY REFERENCES users(user_id),
    created_at DATETIME DEFAULT GETDATE()
);

-- 12. Create Security Profiles Table
CREATE TABLE security_profiles (
    security_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(user_id) ON DELETE CASCADE,
    department_id INT FOREIGN KEY REFERENCES departments(department_id),
    assigned_hod_id INT FOREIGN KEY REFERENCES hod_profiles(hod_id),
    security_code VARCHAR(50) NOT NULL UNIQUE,
    security_name VARCHAR(100) NOT NULL
);
