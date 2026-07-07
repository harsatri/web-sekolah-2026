-- =====================================================
-- MIGRATION 005: Sync schoolName with Schools Name
-- File: backend/db/migrations/005-sync-schoolName.sql
-- Description: Ensure users.schoolName matches schools.name
-- =====================================================

-- Update all users.schoolName to match schools.name
UPDATE users u
INNER JOIN schools s ON u.schoolId = s.id
SET u.schoolName = s.name
WHERE u.schoolId IS NOT NULL AND u.schoolName != s.name;

-- Query to verify inconsistencies
SELECT u.id, u.email, u.schoolId, u.schoolName, s.name as correct_name
FROM users u
LEFT JOIN schools s ON u.schoolId = s.id
WHERE u.schoolId IS NOT NULL AND (u.schoolName IS NULL OR u.schoolName != s.name);

-- Expected result: 0 rows (semua sudah konsisten)

-- Summary:
-- - Ensures consistency: users.schoolName = schools.name
-- - Reduces data redundancy
-- - Prevents stale data in users table
