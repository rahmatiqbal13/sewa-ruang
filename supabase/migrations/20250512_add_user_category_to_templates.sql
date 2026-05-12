-- ============================================================
-- Migration: Add user_category to notification_templates
-- Untuk mendukung template notifikasi yang berbeda per kategori pengguna
-- ============================================================

-- 1. Tambah kolom user_category ke tabel notification_templates
ALTER TABLE public.notification_templates 
ADD COLUMN IF NOT EXISTS user_category TEXT;

-- 2. Update unique constraint untuk include user_category
-- Drop existing unique constraint
ALTER TABLE public.notification_templates 
DROP CONSTRAINT IF EXISTS notification_templates_event_type_channel_key;

-- Add new unique constraint dengan user_category
ALTER TABLE public.notification_templates 
ADD CONSTRAINT notification_templates_event_type_channel_category_key 
UNIQUE (event_type, channel, user_category);

-- 3. Set default value 'default' untuk existing rows
UPDATE public.notification_templates 
SET user_category = 'default' 
WHERE user_category IS NULL;

-- 4. Create index untuk performa
CREATE INDEX IF NOT EXISTS idx_notification_templates_category 
ON public.notification_templates(user_category);

-- 5. Verify
SELECT 'Migration completed: user_category column added to notification_templates' as status;

-- 6. Show current data
SELECT event_type, channel, user_category, is_active 
FROM public.notification_templates 
ORDER BY event_type, channel, user_category;
