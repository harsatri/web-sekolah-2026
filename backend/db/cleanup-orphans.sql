-- =====================================================
-- CLEANUP SCRIPT: Fix Orphan and Inconsistent Data
-- File: backend/db/cleanup-orphans.sql
-- Usage: Run this to clean orphan data BEFORE migrations
-- =====================================================

-- ===== Step 1: Backup existing data =====
-- Create backup tables in case of rollback needed
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS schools_backup AS SELECT * FROM schools;
CREATE TABLE IF NOT EXISTS criteria_requests_backup AS SELECT * FROM criteria_requests;

-- ===== Step 2: Remove orphan users (schoolId doesn't exist in schools) =====
SELECT COUNT(*) as orphan_users_to_delete FROM users 
WHERE schoolId IS NOT NULL 
  AND schoolId NOT IN (SELECT id FROM schools);

-- Delete orphan users
DELETE FROM users 
WHERE schoolId IS NOT NULL 
  AND schoolId NOT IN (SELECT id FROM schools);

-- Log what was deleted
INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) 
VALUES (NULL, 'System', 'system@system.local', 'system', 'cleanup_orphan_users', 
        CONCAT('Deleted ', ROW_COUNT(), ' orphan users with invalid schoolId'));


-- ===== Step 3: Remove duplicate school_admin (keep first one) =====
SELECT COUNT(*) as duplicate_admins_to_delete FROM users u1
WHERE u1.id NOT IN (
  SELECT MIN(u2.id) FROM users u2 
  WHERE u2.role = 'school_admin' AND u2.schoolId IS NOT NULL
  GROUP BY u2.schoolId
)
AND u1.role = 'school_admin' AND u1.schoolId IS NOT NULL;

-- Delete duplicates
DELETE FROM users 
WHERE id NOT IN (
  SELECT MIN(id) FROM users u 
  WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
  GROUP BY u.schoolId
)
AND role = 'school_admin' AND schoolId IS NOT NULL;

-- Log what was deleted
INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) 
VALUES (NULL, 'System', 'system@system.local', 'system', 'cleanup_duplicate_admins', 
        CONCAT('Deleted ', ROW_COUNT(), ' duplicate school_admin records'));


-- ===== Step 4: Fix school_admin without schoolId =====
SELECT COUNT(*) as admins_without_school FROM users 
WHERE role = 'school_admin' AND schoolId IS NULL;

-- Set these admins to regular user role (or handle as needed)
-- Option A: Convert to regular user
UPDATE users SET role = 'user' 
WHERE role = 'school_admin' AND schoolId IS NULL;

-- Log what was updated
INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) 
VALUES (NULL, 'System', 'system@system.local', 'system', 'cleanup_admin_without_school', 
        CONCAT('Converted ', ROW_COUNT(), ' school_admin without schoolId to regular user'));


-- ===== Step 5: Fix super_admin with schoolId =====
SELECT COUNT(*) as super_admins_with_school FROM users 
WHERE role = 'super_admin' AND schoolId IS NOT NULL;

-- Remove schoolId from super_admin
UPDATE users SET schoolId = NULL, schoolName = NULL 
WHERE role = 'super_admin' AND schoolId IS NOT NULL;

-- Log what was updated
INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) 
VALUES (NULL, 'System', 'system@system.local', 'system', 'cleanup_super_admin_schoolid', 
        CONCAT('Removed schoolId from ', ROW_COUNT(), ' super_admin records'));


-- ===== Step 6: Sync schoolName with schools.name =====
SELECT COUNT(*) as inconsistent_names FROM users u
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.schoolName IS NULL OR u.schoolName != s.name;

-- Update schoolName
UPDATE users u
INNER JOIN schools s ON u.schoolId = s.id
SET u.schoolName = s.name
WHERE u.schoolId IS NOT NULL AND (u.schoolName IS NULL OR u.schoolName != s.name);

-- Log what was updated
INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) 
VALUES (NULL, 'System', 'system@system.local', 'system', 'cleanup_sync_schoolname', 
        CONCAT('Synced schoolName for ', ROW_COUNT(), ' users'));


-- ===== Step 7: Clean orphan criteria_requests =====
SELECT COUNT(*) as orphan_criteria_requests FROM criteria_requests cr
LEFT JOIN schools s ON cr.schoolId = s.id
WHERE s.id IS NULL;

-- Note: These will be automatically deleted by CASCADE constraint after migration
-- But we can log them:
INSERT INTO activity_logs (actorId, actorName, actorEmail, actorRole, type, description) 
VALUES (NULL, 'System', 'system@system.local', 'system', 'cleanup_warning_orphan_criteria', 
        'Found orphan criteria_requests (will be deleted by CASCADE constraint)');


-- ===== Step 8: Verify cleaned data =====
SELECT 'VERIFICATION: Orphan users' as check_type, COUNT(*) as count FROM users 
WHERE schoolId IS NOT NULL AND schoolId NOT IN (SELECT id FROM schools)
UNION ALL
SELECT 'VERIFICATION: School without admin', COUNT(*) FROM schools s
LEFT JOIN users u ON s.id = u.schoolId AND u.role = 'school_admin'
WHERE u.id IS NULL
UNION ALL
SELECT 'VERIFICATION: Multiple admins per school', COUNT(*) FROM (
  SELECT u.schoolId FROM users u
  WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
  GROUP BY u.schoolId HAVING COUNT(u.id) > 1
) t
UNION ALL
SELECT 'VERIFICATION: Inconsistent schoolName', COUNT(*) FROM users u
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.schoolName IS NULL OR u.schoolName != s.name
UNION ALL
SELECT 'VERIFICATION: Super admin with schoolId', COUNT(*) FROM users
WHERE role = 'super_admin' AND schoolId IS NOT NULL;

-- Expected result: All 0 rows

-- ===== Summary =====
SELECT 'Cleanup Summary' as status;
SELECT 'Total Users' as metric, COUNT(*) as value FROM users
UNION ALL
SELECT 'Total Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'Total School Admins', COUNT(*) FROM users WHERE role = 'school_admin'
UNION ALL
SELECT 'Schools with Admin', COUNT(DISTINCT u.schoolId) FROM users u WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
UNION ALL
SELECT 'Admin with School', COUNT(*) FROM users u 
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.role = 'school_admin';

-- ===== Final Check =====
-- This query shows if data is clean
SELECT 
  CASE WHEN clean = 0 THEN '✓ DATA IS CLEAN' ELSE '✗ ISSUES REMAIN' END as status,
  orphan_users,
  orphan_schools,
  duplicate_admins,
  inconsistent_names,
  invalid_super_admin
FROM (
  SELECT 
    (SELECT COUNT(*) FROM users WHERE schoolId IS NOT NULL AND schoolId NOT IN (SELECT id FROM schools)) as orphan_users,
    (SELECT COUNT(*) FROM schools s LEFT JOIN users u ON s.id = u.schoolId AND u.role = 'school_admin' WHERE u.id IS NULL) as orphan_schools,
    (SELECT COUNT(*) FROM (SELECT u.schoolId FROM users u WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL GROUP BY u.schoolId HAVING COUNT(*) > 1) t) as duplicate_admins,
    (SELECT COUNT(*) FROM users u INNER JOIN schools s ON u.schoolId = s.id WHERE u.schoolName IS NULL OR u.schoolName != s.name) as inconsistent_names,
    (SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND schoolId IS NOT NULL) as invalid_super_admin,
    (SELECT COUNT(*) + (SELECT COUNT(*) FROM schools s LEFT JOIN users u ON s.id = u.schoolId AND u.role = 'school_admin' WHERE u.id IS NULL) + (SELECT COUNT(*) FROM users WHERE role = 'super_admin' AND schoolId IS NOT NULL)) as clean
) stats;
