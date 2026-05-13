-- Fix: Drop trigger that references non-existent updated_at column on users table
-- Error: 'record "new" has no field "updated_at"' when updating users
-- Actual trigger name discovered: update_users_updated_at

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- Note: activity_log_users trigger is intentionally kept (used for audit logging)
