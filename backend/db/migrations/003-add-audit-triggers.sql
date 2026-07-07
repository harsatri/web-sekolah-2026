-- =====================================================
-- MIGRATION 003: Add Audit Tables and Triggers
-- File: backend/db/migrations/003-add-audit-triggers.sql
-- Description: Create audit tables and triggers for relationship changes
-- =====================================================

-- Create audit table for users
CREATE TABLE IF NOT EXISTS users_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(10) NOT NULL,
  old_schoolId INT NULL,
  new_schoolId INT NULL,
  old_role VARCHAR(32) NULL,
  new_role VARCHAR(32) NULL,
  changed_by INT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_changed_at (changed_at)
);

-- Create audit table for schools
CREATE TABLE IF NOT EXISTS schools_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  action VARCHAR(10) NOT NULL,
  old_name VARCHAR(191),
  new_name VARCHAR(191),
  old_district VARCHAR(191),
  new_district VARCHAR(191),
  changed_by INT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_school_id (school_id),
  INDEX idx_changed_at (changed_at)
);

-- Create audit table for relationship changes
CREATE TABLE IF NOT EXISTS relationship_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_table VARCHAR(32) NOT NULL,
  from_id INT NOT NULL,
  to_table VARCHAR(32) NOT NULL,
  to_id INT NOT NULL,
  action VARCHAR(20) NOT NULL,
  details JSON,
  changed_by INT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_action (action),
  INDEX idx_changed_at (changed_at)
);

-- Trigger: Audit user schoolId changes
DELIMITER //
CREATE TRIGGER trg_users_schoolId_audit 
BEFORE UPDATE ON users 
FOR EACH ROW 
BEGIN
  IF (OLD.schoolId != NEW.schoolId) OR (OLD.role != NEW.role) THEN
    INSERT INTO users_audit (user_id, action, old_schoolId, new_schoolId, old_role, new_role, changed_at)
    VALUES (OLD.id, 'UPDATE', OLD.schoolId, NEW.schoolId, OLD.role, NEW.role, NOW());
  END IF;
END //
DELIMITER ;

-- Trigger: Audit user deletion
DELIMITER //
CREATE TRIGGER trg_users_delete_audit 
BEFORE DELETE ON users 
FOR EACH ROW 
BEGIN
  INSERT INTO users_audit (user_id, action, old_schoolId, new_schoolId, old_role, new_role, changed_at)
  VALUES (OLD.id, 'DELETE', OLD.schoolId, NULL, OLD.role, NULL, NOW());
END //
DELIMITER ;

-- Trigger: Audit school name changes
DELIMITER //
CREATE TRIGGER trg_schools_name_audit 
BEFORE UPDATE ON schools 
FOR EACH ROW 
BEGIN
  IF (OLD.name != NEW.name) OR (OLD.district != NEW.district) THEN
    INSERT INTO schools_audit (school_id, action, old_name, new_name, old_district, new_district, changed_at)
    VALUES (OLD.id, 'UPDATE', OLD.name, NEW.name, OLD.district, NEW.district, NOW());
  END IF;
END //
DELIMITER ;

-- Trigger: Audit school deletion
DELIMITER //
CREATE TRIGGER trg_schools_delete_audit 
BEFORE DELETE ON schools 
FOR EACH ROW 
BEGIN
  INSERT INTO schools_audit (school_id, action, old_name, new_name, old_district, new_district, changed_at)
  VALUES (OLD.id, 'DELETE', OLD.name, NULL, OLD.district, NULL, NOW());
END //
DELIMITER ;

-- Verification
SELECT TRIGGER_NAME FROM INFORMATION_SCHEMA.TRIGGERS 
WHERE TRIGGER_SCHEMA = DATABASE();
-- Expected: trg_users_schoolId_audit, trg_users_delete_audit, trg_schools_name_audit, trg_schools_delete_audit

-- Summary:
-- - Audit tables track all changes ke relationships
-- - Triggers automatically record changes
-- - Data retention: permanent (untuk compliance)
