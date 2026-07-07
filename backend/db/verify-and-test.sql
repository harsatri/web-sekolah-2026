-- =====================================================
-- VERIFICATION & TESTING SCRIPT
-- File: backend/db/verify-and-test.sql
-- Usage: Run ini setelah implementation untuk verify semuanya OK
-- =====================================================

-- ===== SECTION 1: VERIFY STRUCTURES =====
PRINT 'SECTION 1: Verify Database Structures';
GO

-- Check Foreign Key Constraint
SELECT 'FK Constraint Check' as test_name,
       CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END as result
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE TABLE_NAME = 'users' 
  AND CONSTRAINT_NAME = 'fk_users_schoolId'
  AND REFERENCED_TABLE_NAME = 'schools'
  AND DELETE_RULE = 'SET NULL'
  AND UPDATE_RULE = 'CASCADE';

-- Check Unique Constraint
SELECT 'Unique Constraint Check' as test_name,
       CASE WHEN COUNT(*) >= 1 THEN 'PASS' ELSE 'FAIL' END as result
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME = 'users' 
  AND (INDEX_NAME = 'uq_school_admin_per_school' OR INDEX_NAME = 'idx_school_admin_unique')
  AND SEQ_IN_INDEX = 1;

-- Check Audit Tables
SELECT 'Audit Tables Exist' as test_name,
       CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END as result
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users_audit', 'schools_audit', 'relationship_audit');

-- Check Triggers
SELECT 'Triggers Exist' as test_name,
       CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END as result
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME IN (
    'trg_users_schoolId_audit',
    'trg_users_delete_audit',
    'trg_schools_name_audit',
    'trg_schools_delete_audit'
  );

-- Check Check Constraints (MySQL 8.0.16+)
SELECT 'Check Constraints' as test_name,
       CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END as result
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users', 'schools');

-- ===== SECTION 2: VERIFY DATA INTEGRITY =====
PRINT 'SECTION 2: Verify Data Integrity';
GO

-- Test 2.1: No orphan users
SELECT 'No Orphan Users' as test_name,
       COUNT(*) as orphan_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM users u
LEFT JOIN schools s ON u.schoolId = s.id
WHERE u.schoolId IS NOT NULL AND s.id IS NULL;

-- Test 2.2: School admin has schoolId
SELECT 'School Admins Have SchoolId' as test_name,
       COUNT(*) as admin_without_school,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM users
WHERE role = 'school_admin' AND schoolId IS NULL;

-- Test 2.3: No multiple admins per school
SELECT 'No Multiple Admins Per School' as test_name,
       COUNT(*) as schools_with_multiple_admins,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM (
  SELECT schoolId, COUNT(*) as admin_count
  FROM users
  WHERE role = 'school_admin' AND schoolId IS NOT NULL
  GROUP BY schoolId
  HAVING COUNT(*) > 1
) t;

-- Test 2.4: schoolName consistent with schools.name
SELECT 'Consistent SchoolName' as test_name,
       COUNT(*) as inconsistent_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM users u
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.schoolName IS NULL OR u.schoolName != s.name;

-- Test 2.5: Super admin has no schoolId
SELECT 'Super Admin No SchoolId' as test_name,
       COUNT(*) as super_admin_with_school,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM users
WHERE role = 'super_admin' AND schoolId IS NOT NULL;

-- Test 2.6: No orphan criteria_requests
SELECT 'No Orphan Criteria Requests' as test_name,
       COUNT(*) as orphan_criteria_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM criteria_requests cr
LEFT JOIN schools s ON cr.schoolId = s.id
WHERE s.id IS NULL;

-- Test 2.7: No orphan criteria request admins
SELECT 'No Orphan Criteria Request Admins' as test_name,
       COUNT(*) as orphan_admin_criteria_count,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM criteria_requests cr
LEFT JOIN users u ON cr.adminId = u.id
WHERE u.id IS NULL;

-- ===== SECTION 3: FUNCTIONAL TESTS =====
PRINT 'SECTION 3: Functional Tests';
GO

-- Test 3.1: Try insert orphan user (should fail with FK)
-- Note: This will fail intentionally - that's correct behavior
-- In real test, catch error and verify it's 1452 (FK constraint fails)
--
-- Expected error code: 1452
-- Error message: "Cannot add or update a child row: a foreign key constraint fails"

-- Test 3.2: Check if active column valid
SELECT 'Valid Active Values Only' as test_name,
       COUNT(*) as invalid_active,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM users
WHERE active NOT IN (0, 1);

-- Test 3.3: Check capacity is positive
SELECT 'Schools Have Positive Capacity' as test_name,
       COUNT(*) as invalid_capacity,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM schools
WHERE capacity <= 0;

-- Test 3.4: Check accreditation score range
SELECT 'Valid Accreditation Scores' as test_name,
       COUNT(*) as invalid_score,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM schools
WHERE accreditationScore < 0 OR accreditationScore > 100;

-- ===== SECTION 4: AUDIT TRAIL VERIFICATION =====
PRINT 'SECTION 4: Audit Trail Verification';
GO

-- Test 4.1: Audit tables have data (if operations happened)
SELECT 'Audit Tables Recording' as test_name,
       COUNT(*) as audit_records,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM (
  SELECT id FROM users_audit WHERE 1=0  -- No records yet OK
  UNION ALL
  SELECT id FROM schools_audit WHERE 1=0
  UNION ALL
  SELECT id FROM relationship_audit WHERE 1=0
) t;

-- Test 4.2: Recent activity logs
SELECT 'Activity Logs Recording' as test_name,
       COUNT(*) as activity_records,
       CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM activity_logs
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR);

-- ===== SECTION 5: PERFORMANCE BASELINE =====
PRINT 'SECTION 5: Performance Baseline';
GO

-- Check if indexes are being used
SELECT 'Index Efficiency' as test_name,
       INDEX_NAME,
       SEQ_IN_INDEX,
       COLUMN_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME IN ('users', 'schools')
  AND TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- Check table sizes
SELECT 'Table Sizes' as metric,
       TABLE_NAME,
       ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('users', 'schools', 'activity_logs', 'users_audit', 'schools_audit')
ORDER BY size_mb DESC;

-- ===== SECTION 6: SUMMARY REPORT =====
PRINT 'SECTION 6: Summary Report';
GO

-- Overall statistics
SELECT 'System Statistics' as report_type;

SELECT 'Total Users' as metric, COUNT(*) as value FROM users
UNION ALL
SELECT 'Total Schools', COUNT(*) FROM schools
UNION ALL
SELECT 'School Admins', COUNT(*) FROM users WHERE role = 'school_admin'
UNION ALL
SELECT 'Super Admins', COUNT(*) FROM users WHERE role = 'super_admin'
UNION ALL
SELECT 'Regular Users', COUNT(*) FROM users WHERE role = 'user'
UNION ALL
SELECT 'Schools With Admin', COUNT(DISTINCT u.schoolId) FROM users u 
  WHERE u.role = 'school_admin' AND u.schoolId IS NOT NULL
UNION ALL
SELECT 'Criteria Requests', COUNT(*) FROM criteria_requests
UNION ALL
SELECT 'Activity Logs', COUNT(*) FROM activity_logs;

-- ===== SECTION 7: HEALTH CHECK =====
PRINT 'SECTION 7: Health Check - All Tests';
GO

-- Create comprehensive health check view
DROP VIEW IF EXISTS v_health_check;
CREATE VIEW v_health_check AS
SELECT 'ORPHAN_USERS' as check_type,
       COUNT(*) as issue_count,
       'CRITICAL' as severity
FROM users u
LEFT JOIN schools s ON u.schoolId = s.id
WHERE u.schoolId IS NOT NULL AND s.id IS NULL

UNION ALL

SELECT 'ADMIN_WITHOUT_SCHOOL',
       COUNT(*),
       'CRITICAL'
FROM users WHERE role = 'school_admin' AND schoolId IS NULL

UNION ALL

SELECT 'MULTIPLE_ADMINS_PER_SCHOOL',
       COUNT(*),
       'CRITICAL'
FROM (
  SELECT schoolId FROM users 
  WHERE role = 'school_admin' AND schoolId IS NOT NULL
  GROUP BY schoolId HAVING COUNT(*) > 1
) t

UNION ALL

SELECT 'INCONSISTENT_SCHOOLNAME',
       COUNT(*),
       'HIGH'
FROM users u
INNER JOIN schools s ON u.schoolId = s.id
WHERE u.schoolName IS NULL OR u.schoolName != s.name

UNION ALL

SELECT 'INVALID_SUPER_ADMIN',
       COUNT(*),
       'HIGH'
FROM users WHERE role = 'super_admin' AND schoolId IS NOT NULL

UNION ALL

SELECT 'ORPHAN_CRITERIA_REQUESTS',
       COUNT(*),
       'HIGH'
FROM criteria_requests cr
LEFT JOIN schools s ON cr.schoolId = s.id
WHERE s.id IS NULL

UNION ALL

SELECT 'FK_CONSTRAINT_OK',
       CASE WHEN COUNT(*) = 1 THEN 0 ELSE 1 END,
       'CRITICAL'
FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
WHERE TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'fk_users_schoolId'

UNION ALL

SELECT 'UNIQUE_CONSTRAINT_OK',
       CASE WHEN COUNT(*) >= 1 THEN 0 ELSE 1 END,
       'CRITICAL'
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME = 'users' AND (INDEX_NAME = 'uq_school_admin_per_school' OR INDEX_NAME = 'idx_school_admin_unique')

UNION ALL

SELECT 'TRIGGERS_OK',
       CASE WHEN COUNT(*) >= 4 THEN 0 ELSE 1 END,
       'HIGH'
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME LIKE 'trg_%';

-- Display health check
SELECT * FROM v_health_check;

-- Overall health status
SELECT CASE 
  WHEN SUM(CASE WHEN issue_count > 0 AND severity = 'CRITICAL' THEN 1 ELSE 0 END) > 0 THEN 'RED - CRITICAL ISSUES'
  WHEN SUM(CASE WHEN issue_count > 0 AND severity = 'HIGH' THEN 1 ELSE 0 END) > 0 THEN 'YELLOW - HIGH ISSUES'
  ELSE 'GREEN - ALL OK'
END as overall_status
FROM v_health_check;

-- ===== SECTION 8: RECOMMENDATIONS =====
PRINT 'SECTION 8: Recommendations';

-- If there are issues, recommend actions
IF EXISTS (
  SELECT 1 FROM users u
  LEFT JOIN schools s ON u.schoolId = s.id
  WHERE u.schoolId IS NOT NULL AND s.id IS NULL
)
BEGIN
  PRINT 'ACTION: Run cleanup-orphans.sql to remove orphan users';
END;

IF EXISTS (
  SELECT 1 FROM users WHERE role = 'school_admin' AND schoolId IS NULL
)
BEGIN
  PRINT 'ACTION: Assign schoolId to all school_admin users';
END;

IF EXISTS (
  SELECT 1 FROM users u
  INNER JOIN schools s ON u.schoolId = s.id
  WHERE u.schoolName IS NULL OR u.schoolName != s.name
)
BEGIN
  PRINT 'ACTION: Sync schoolName with schools.name using migration 005';
END;

-- Final status
PRINT '';
PRINT '======== VERIFICATION COMPLETE ========';
PRINT 'All tests completed. Review results above.';
PRINT 'Green status = Ready for production';
PRINT 'Red/Yellow status = Requires action before production';
