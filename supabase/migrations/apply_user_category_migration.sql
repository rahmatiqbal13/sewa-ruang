-- ============================================================
-- Migration: Add user_category to notification_templates
-- Combined migration file - Run this in Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom user_category ke tabel notification_templates
ALTER TABLE public.notification_templates 
ADD COLUMN IF NOT EXISTS user_category TEXT DEFAULT 'default';

-- 2. Update existing rows yang NULL
UPDATE public.notification_templates 
SET user_category = 'default' 
WHERE user_category IS NULL;

-- 3. Drop constraint lama jika ada
ALTER TABLE public.notification_templates 
DROP CONSTRAINT IF EXISTS notification_templates_event_type_channel_key;

ALTER TABLE public.notification_templates 
DROP CONSTRAINT IF EXISTS notification_templates_event_type_channel_category_key;

-- 4. Buat unique constraint baru dengan user_category
ALTER TABLE public.notification_templates 
ADD CONSTRAINT notification_templates_event_type_channel_category_key 
UNIQUE (event_type, channel, user_category);

-- 5. Create index untuk performa
CREATE INDEX IF NOT EXISTS idx_notification_templates_category 
ON public.notification_templates(user_category);

-- 6. Grant permissions
GRANT ALL ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO anon;

-- 7. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 8. Verify
SELECT 
  'Migration applied successfully!' as status,
  (SELECT COUNT(*) FROM public.notification_templates) as total_templates,
  (SELECT COUNT(*) FROM public.notification_templates WHERE user_category IS NULL) as null_categories,
  (SELECT COUNT(DISTINCT user_category) FROM public.notification_templates) as unique_categories;

-- 9. Show sample data
SELECT event_type, channel, user_category, is_active 
FROM public.notification_templates 
ORDER BY event_type, channel, user_category
LIMIT 10;
