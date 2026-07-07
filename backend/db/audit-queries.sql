-- =====================================================
-- AUDIT QUERIES: Detect Orphan and Inconsistent Data
-- File: backend/db/audit-queries.sql
-- Usage: Run these queries regularly to detect issues
-- =====================================================

-- ===== QUERY 1: Orphan Users (schoolId doesn't exist in schools) =====
SELECT 'ORPHAN_USERS' as audit_type, u.id, u.name, u.email, u.role, u.schoolId, u.schoolName
FROM users u
LEFT JOIN schools s ON u.schoolId = s.id
WHERE u.schoolId IS NOT NULL AND s.id IS NULL;

-- Expected: 0 rows
-- If found: School was deleted but admin wasn't cleaned up


-- ===== QUERY 2: School Admins without School ID =====
SELECT 'ADMIN_WITHOUT_SCHOOL' as audit_type, u.id, u.name, u.email, u.role
FROM users u
WHERE u.role = 'school_admin' AND u.schoolId IS NULL;

-- Expected: 0 rows
-- If found: School admin not properly assigned


-- ===== QUERY 3: Schools without Admin =====
SELECT 'SCHOOL_WITHOUT_ADMIN' as audit_type, s.id, s.name, s.district, COUNT(u.id) as admin_count
FROM schools s
LEFT JOIN users u ON s.id = u.schoolId AND u.role = 'school_admin'
GROUP BY s.id, s.name, s.district
HAVING COUNT(u.id) = 0;

-- Expected: 0 rows
-- If found: School not assigned to admin


-- ===== QUERY 4: Multiple Admins per School =====
SELECT 'MULTIPLE_ADMINS_PER_SCHOOL' as audit_type, u.schoolId, COUNT(u.id) as admin_count, 
       GROUP_CONCAT(u.name) as admin_names, GROUP_CONCAT(u.email) as admin_emails
FROM users u
WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
GROUP BY u.schoolId
HAVING COUNT(u.id) > 1;

-- Expected: 0 rows
-- If found: Data integrity violation - multiple admins for 1 school


-- ===== QUERY 5: Inconsistent schoolName =====
SELECT 'INCONSISTENT_SCHOOLNAME' as audit_type, u.id, u.name, u.email, u.schoolId, 
       u.schoolName as user_schoolName, s.name as actual_schoolName
FROM users u
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.schoolName IS NULL OR u.schoolName != s.name;

-- Expected: 0 rows
-- If found: schoolName not synced with schools.name


-- ===== QUERY 6: Super Admins with SchoolId =====
SELECT 'INVALID_SUPER_ADMIN_SCHOOL' as audit_type, u.id, u.name, u.email, u.schoolId, u.schoolName
FROM users u
WHERE u.role = 'super_admin' AND u.schoolId IS NOT NULL;

-- Expected: 0 rows
-- If found: Super admin shouldn't be assigned to school


-- ===== QUERY 7: Regular Users with SchoolId (potential issues) =====
SELECT 'USER_WITH_INVALID_SCHOOLID' as audit_type, u.id, u.name, u.email, u.role, u.schoolId
FROM users u
LEFT JOIN schools s ON u.schoolId = s.id
WHERE u.role = 'user' AND u.schoolId IS NOT NULL AND s.id IS NULL;

-- Expected: 0 rows
-- If found: Regular user assigned to non-existent school


-- ===== QUERY 8: Criteria Requests with invalid schoolId =====
SELECT 'ORPHAN_CRITERIA_REQUESTS' as audit_type, cr.id, cr.schoolId, cr.adminId, cr.schoolName
FROM criteria_requests cr
LEFT JOIN schools s ON cr.schoolId = s.id
WHERE s.id IS NULL;

-- Expected: 0 rows
-- If found: Criteria request for deleted school


-- ===== QUERY 9: Criteria Requests with invalid adminId =====
SELECT 'ORPHAN_CRITERIA_REQUEST_ADMINS' as audit_type, cr.id, cr.adminId, cr.schoolId, cr.adminName
FROM criteria_requests cr
LEFT JOIN users u ON cr.adminId = u.id
WHERE u.id IS NULL;

-- Expected: 0 rows
-- If found: Criteria request by deleted admin


-- ===== QUERY 10: Activity Logs with missing actors =====
SELECT 'ORPHAN_ACTIVITY_LOG_ACTORS' as audit_type, al.id, al.actorId, al.actorName, al.actorEmail
FROM activity_logs al
LEFT JOIN users u ON al.actorId = u.id
WHERE al.actorId IS NOT NULL AND u.id IS NULL;

-- Expected: 0 rows
-- If found: Activity log reference invalid


-- ===== QUERY 11: Summary Statistics =====
SELECT 
  'TOTAL_USERS' as stat_type,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  'TOTAL_SCHOOL_ADMINS' as stat_type,
  COUNT(*) as count
FROM users WHERE role = 'school_admin'
UNION ALL
SELECT 
  'TOTAL_SUPER_ADMINS' as stat_type,
  COUNT(*) as count
FROM users WHERE role = 'super_admin'
UNION ALL
SELECT 
  'TOTAL_REGULAR_USERS' as stat_type,
  COUNT(*) as count
FROM users WHERE role = 'user'
UNION ALL
SELECT 
  'TOTAL_SCHOOLS' as stat_type,
  COUNT(*) as count
FROM schools
UNION ALL
SELECT 
  'SCHOOLS_WITH_ADMIN' as stat_type,
  COUNT(DISTINCT u.schoolId) as count
FROM users u WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
UNION ALL
SELECT 
  'TOTAL_CRITERIA_REQUESTS' as stat_type,
  COUNT(*) as count
FROM criteria_requests;

-- ===== QUERY 12: Audit Trail - Recent Changes =====
SELECT 'RECENT_USER_CHANGES' as audit_type, 
       ua.user_id, ua.action, ua.old_schoolId, ua.new_schoolId, ua.old_role, ua.new_role, ua.changed_at
FROM users_audit ua
ORDER BY ua.changed_at DESC
LIMIT 20;

SELECT 'RECENT_SCHOOL_CHANGES' as audit_type,
       sa.school_id, sa.action, sa.old_name, sa.new_name, sa.changed_at
FROM schools_audit sa
ORDER BY sa.changed_at DESC
LIMIT 20;

-- ===== COMPREHENSIVE AUDIT REPORT =====
-- Create a complete audit view
CREATE OR REPLACE VIEW v_data_integrity_audit AS
SELECT 
  'ORPHAN_USERS' as issue_type,
  CAST(COUNT(*) AS CHAR) as count,
  'Users dengan schoolId yang tidak ada di schools' as description
FROM users u
LEFT JOIN schools s ON u.schoolId = s.id
WHERE u.schoolId IS NOT NULL AND s.id IS NULL

UNION ALL

SELECT 
  'SCHOOL_WITHOUT_ADMIN' as issue_type,
  CAST(COUNT(*) AS CHAR) as count,
  'Schools tanpa school_admin assignment' as description
FROM schools s
LEFT JOIN users u ON s.id = u.schoolId AND u.role = 'school_admin'
WHERE u.id IS NULL

UNION ALL

SELECT 
  'MULTIPLE_ADMINS_PER_SCHOOL' as issue_type,
  CAST(COUNT(*) AS CHAR) as count,
  'Schools dengan lebih dari 1 school_admin' as description
FROM (
  SELECT u.schoolId, COUNT(u.id) as cnt
  FROM users u
  WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
  GROUP BY u.schoolId
  HAVING COUNT(u.id) > 1
) t

UNION ALL

SELECT 
  'INCONSISTENT_SCHOOLNAME' as issue_type,
  CAST(COUNT(*) AS CHAR) as count,
  'Users dengan schoolName tidak sesuai schools.name' as description
FROM users u
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.schoolName IS NULL OR u.schoolName != s.name

UNION ALL

SELECT 
  'INVALID_SUPER_ADMIN' as issue_type,
  CAST(COUNT(*) AS CHAR) as count,
  'Super admin dengan schoolId (invalid)' as description
FROM users
WHERE role = 'super_admin' AND schoolId IS NOT NULL

UNION ALL

SELECT 
  'ORPHAN_CRITERIA_REQUESTS' as issue_type,
  CAST(COUNT(*) AS CHAR) as count,
  'Criteria requests dengan invalid schoolId' as description
FROM criteria_requests cr
LEFT JOIN schools s ON cr.schoolId = s.id
WHERE s.id IS NULL;

-- View the comprehensive report
SELECT * FROM v_data_integrity_audit;
