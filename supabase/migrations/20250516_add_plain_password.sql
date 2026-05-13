-- Add plain_password column for super admin visibility
-- Passwords stored here only when set/changed by super admin
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plain_password text;

-- Restrict read access: only service_role (admin client) can read this column
-- Regular authenticated users cannot read other users' plain_password via RLS
COMMENT ON COLUMN public.users.plain_password IS 'Plain text password — visible only to super admin. Updated whenever super admin sets/changes a password.';
