-- Migration: Fix notification schema to match application code
-- Adds missing columns for per-category templates and notification logging

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================

-- Add user_category column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notification_templates' AND column_name = 'user_category'
  ) THEN
    ALTER TABLE public.notification_templates ADD COLUMN user_category TEXT NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Update unique constraint to include user_category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'notification_templates_event_type_channel_key'
  ) THEN
    ALTER TABLE public.notification_templates DROP CONSTRAINT notification_templates_event_type_channel_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'notification_templates_event_type_channel_user_category_key'
  ) THEN
    ALTER TABLE public.notification_templates ADD UNIQUE (event_type, channel, user_category);
  END IF;
END $$;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Add missing columns for notification logging
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN channel TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'recipient'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN recipient TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN status TEXT DEFAULT 'sent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Make user_id nullable (notification can be system-generated without a specific user)
DO $$
BEGIN
  ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- If already nullable, ignore
  NULL;
END $$;

-- Add indexes for common notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_booking ON public.notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON public.notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
