-- =====================================================
-- MIGRATION 001: Add Foreign Key Constraint
-- File: backend/db/migrations/001-add-fk-users-schools.sql
-- Description: Add FK constraint dari users.schoolId ke schools.id
-- =====================================================

-- Step 1: Clean orphan data (users dengan schoolId yang tidak ada di schools)
DELETE FROM users 
WHERE schoolId IS NOT NULL 
  AND schoolId NOT IN (SELECT id FROM schools);

-- Step 2: Add Foreign Key Constraint dengan ON DELETE SET NULL dan ON UPDATE CASCADE
ALTER TABLE users 
ADD CONSTRAINT fk_users_schoolId 
FOREIGN KEY (schoolId) REFERENCES schools(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Verification
SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'schoolId' AND REFERENCED_TABLE_NAME = 'schools';
-- Expected: 1 row dengan CONSTRAINT_NAME = 'fk_users_schoolId'

-- Summary: 
-- - ON DELETE SET NULL: Jika school dihapus, users.schoolId menjadi NULL (safe)
-- - ON UPDATE CASCADE: Jika schools.id berubah (rare), users.schoolId ikut berubah
-- - Prevents: Invalid schoolId values
