-- ============================================================
-- Fix: Refresh schema cache setelah menambah kolom user_category
-- ============================================================

-- 1. Pastikan kolom sudah ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notification_templates' 
    AND column_name = 'user_category'
  ) THEN
    ALTER TABLE public.notification_templates 
    ADD COLUMN user_category TEXT DEFAULT 'default';
  END IF;
END $$;

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

-- 5. Grant permissions
GRANT ALL ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO anon;

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- 7. Verify
SELECT 
  'Migration fix applied successfully' as status,
  (SELECT COUNT(*) FROM public.notification_templates WHERE user_category IS NULL) as null_categories,
  (SELECT COUNT(DISTINCT user_category) FROM public.notification_templates) as unique_categories;

-- 8. Show sample data
SELECT event_type, channel, user_category, is_active 
FROM public.notification_templates 
ORDER BY event_type, channel, user_category
LIMIT 10;
