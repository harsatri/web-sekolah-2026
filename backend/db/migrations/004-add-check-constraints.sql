-- =====================================================
-- MIGRATION 004: Add Check Constraints
-- File: backend/db/migrations/004-add-check-constraints.sql
-- Description: Add CHECK constraints untuk enforce business rules
-- =====================================================

-- Check Constraint 1: school_admin must have valid schoolId
ALTER TABLE users 
ADD CONSTRAINT chk_school_admin_must_have_school 
CHECK (
  NOT (role = 'school_admin' AND schoolId IS NULL)
);

-- Check Constraint 2: super_admin must NOT have schoolId
ALTER TABLE users 
ADD CONSTRAINT chk_super_admin_must_not_have_school 
CHECK (
  NOT (role = 'super_admin' AND schoolId IS NOT NULL)
);

-- Check Constraint 3: Ensure active is 0 or 1
ALTER TABLE users 
ADD CONSTRAINT chk_active_valid 
CHECK (active IN (0, 1));

-- Check Constraint 4: school capacity must be positive
ALTER TABLE schools 
ADD CONSTRAINT chk_schools_capacity_positive 
CHECK (capacity > 0);

-- Check Constraint 5: accreditationScore between 0-100
ALTER TABLE schools 
ADD CONSTRAINT chk_schools_accreditation_score_valid 
CHECK (accreditationScore >= 0 AND accreditationScore <= 100);

-- Verification
SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'users' AND CONSTRAINT_TYPE = 'CHECK';

SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'schools' AND CONSTRAINT_TYPE = 'CHECK';

-- Summary:
-- - Enforces business rules at database level
-- - Prevents invalid data entry
-- - Reduces need for application-level validation
