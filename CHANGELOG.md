# Changelog - Sewa Ruang & Alat

All notable changes and fixes to the system.

## [Unreleased] - 2025-05-12

### Fixed

#### User Creation - "Database error creating new user" (Auth API Error)
**Issue:** Creating new users via admin API failed with error:
- Error: `Database error creating new user`
- Code: `unexpected_failure`
- Status: `500`

**Root Cause:** The database trigger `on_auth_user_created` on `auth.users` table was failing when trying to insert into `public.users`. This caused the entire auth transaction to rollback.

**Symptoms:**
1. Test script (`scripts/test-auth.js`) showed `AuthApiError: Database error creating new user`
2. Listing users worked fine (proving service role key is valid)
3. Creating auth user failed with 500 error

**Fix Applied:**

1. **Modified trigger function** (`supabase/migrations/20250512_fix_auth_trigger.sql`):
   - Added `EXCEPTION WHEN OTHERS` block to catch and log errors without failing the auth transaction
   - Wrapped INSERT in BEGIN/EXCEPTION block
   - Changed from `ON CONFLICT DO NOTHING` to `ON CONFLICT DO UPDATE` for better handling
   - Added proper COALESCE defaults for all nullable fields

2. **Database schema fixes**:
   - Added missing columns: `phone`, `borrower_category`, `institution`, `class_division`, `identity_number`, `telegram_username`
   - Set proper DEFAULT values for all columns
   - Disabled RLS on `public.users` table
   - Granted proper permissions

3. **API route improvements** (`src/app/api/super-admin/users/route.ts`):
   - Better error logging and debugging
   - Fallback to manual insert if trigger fails
   - Uses empty strings instead of NULL for optional fields

**SQL Migration Required:**
```sql
-- Run this in Supabase Dashboard → SQL Editor
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.users (id, name, email, role, phone, borrower_category, institution, class_division, identity_number, telegram_username, created_at, updated_at)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email, COALESCE(NEW.raw_user_meta_data->>'role', 'borrower'), COALESCE(NEW.raw_user_meta_data->>'phone', ''), COALESCE(NEW.raw_user_meta_data->>'borrower_category', 'mahasiswa'), COALESCE(NEW.raw_user_meta_data->>'institution', ''), COALESCE(NEW.raw_user_meta_data->>'class_division', ''), COALESCE(NEW.raw_user_meta_data->>'identity_number', ''), COALESCE(NEW.raw_user_meta_data->>'telegram_username', ''), NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Trigger error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Testing:**
```bash
node scripts/test-auth.js
```

---

#### DeleteUserButton - Hydration Error (Nested Buttons)
**Issue:** Console error: `In HTML, <button> cannot be a descendant of <button>. This will cause a hydration error.`

**Root Cause:** `AlertDialogTrigger` component renders its own `<button>` element, and inside it was another `<Button>` component from shadcn/ui.

**Fix Applied:** (`src/app/(admin)/admin/users/DeleteUserButton.tsx`)
- Changed from wrapping a `<Button>` inside `<AlertDialogTrigger>` 
- To applying button styling classes directly to `AlertDialogTrigger` using `buttonVariants()`

```tsx
// Before (broken):
<AlertDialogTrigger asChild>
  <Button>...</Button>
</AlertDialogTrigger>

// After (fixed):
<AlertDialogTrigger
  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), '...')}
>
  <Trash2 className="h-3.5 w-3.5" />
</AlertDialogTrigger>
```

---

## [Previous] - 2025-05-11

### Database Migrations

- Added `institution_profile` table for storing institution branding
- Fixed RLS policies for notifications and templates
- Added `borrower_category` and additional fields to `users` table
- Fixed inventory RLS policies

### Features

- Institution profile settings page
- Public pages with dynamic branding
- Email/PDF templates with institution branding
- Admin dashboard with institution banner

## Environment Variables Required

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Must have service_role, NOT anon

# Email (Required for password reset)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Optional
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
TELEGRAM_BOT_TOKEN=...
```

## Troubleshooting Guide

### "Database error creating new user"
1. Check Supabase Dashboard → Logs → Auth for trigger errors
2. Run the migration SQL above to fix the trigger
3. Ensure `public.users` table has all required columns
4. Test with: `node scripts/test-auth.js`

### Hydration errors with buttons
- Use `asChild` prop carefully - some shadcn components don't work well with it
- Alternative: Apply button styles directly using `buttonVariants()`

### Service Role Key Issues
- Must start with `eyJ...`
- JWT payload must have `"role": "service_role"`
- Can verify with: `node -e "const t='YOUR_KEY'; console.log(JSON.parse(Buffer.from(t.split('.')[1],'base64').toString()))"`
