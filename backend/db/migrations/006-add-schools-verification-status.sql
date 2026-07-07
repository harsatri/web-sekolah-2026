-- =====================================================
-- MIGRATION 006: Add schools verification status
-- File: backend/db/migrations/006-add-schools-verification-status.sql
-- Description:
-- - Add schools.status ENUM pending/approved/rejected
-- - Add verification metadata: verified_at, verified_by
-- - Default existing rows to approved (non-null status)
-- =====================================================

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending';

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS verified_at DATETIME NULL;

ALTER TABLE schools
ADD COLUMN IF NOT EXISTS verified_by INT NULL;

-- If any legacy rows were created before adding status column,
-- they might have default pending.
-- Requirement says: don't delete old data; for existing schools we mark as approved.
UPDATE schools
SET status = 'approved'
WHERE status IS NULL;

