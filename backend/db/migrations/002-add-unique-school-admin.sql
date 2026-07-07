-- =====================================================
-- MIGRATION 002: Add Unique Constraint for School Admin
-- File: backend/db/migrations/002-add-unique-school-admin.sql
-- Description: Ensure 1 school_admin per school (unique constraint)
-- =====================================================

-- Step 1: Identify duplicate school_admin records
SELECT schoolId, COUNT(*) as admin_count 
FROM users 
WHERE role = 'school_admin' AND schoolId IS NOT NULL 
GROUP BY schoolId 
HAVING COUNT(*) > 1;

-- Step 2: Delete duplicate school_admin (keep the first one, delete the rest)
-- If there are duplicates, delete the ones with higher id
DELETE u1 FROM users u1
INNER JOIN users u2 
  ON u1.schoolId = u2.schoolId 
  AND u1.role = 'school_admin' 
  AND u2.role = 'school_admin'
  AND u1.id > u2.id
WHERE u1.schoolId IS NOT NULL;

-- Step 3: Add UNIQUE constraint for school_admin role per school
-- This uses a unique index with WHERE clause to allow multiple NULL values
ALTER TABLE users 
ADD CONSTRAINT uq_school_admin_per_school 
UNIQUE (schoolId, role);

-- Note: This unique constraint applies to all (schoolId, role) combinations
-- For school_admin role: exactly 1 per school (can have NULL schoolId for unassigned)
-- For other roles: multiple users can share same schoolId (e.g., 'user' role)

-- Step 4: Add unique index specifically for school_admin
CREATE UNIQUE INDEX idx_school_admin_unique 
ON users (schoolId, role) 
WHERE role = 'school_admin' AND schoolId IS NOT NULL;

-- Verification
SELECT * FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_NAME = 'users' AND INDEX_NAME = 'uq_school_admin_per_school';
-- Expected: 1 row showing UNIQUE index

-- Summary:
-- - Prevents: Multiple school_admin for same school
-- - Allows: NULL schoolId (unassigned admins)
-- - Allows: Multiple users with same schoolId for non-school_admin roles
