-- Migration: Add door_photo_url to rooms table
-- Created: 2026-05-29

ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS door_photo_url TEXT;

COMMENT ON COLUMN public.rooms.door_photo_url IS 'URL foto pintu ruangan untuk memudahkan identifikasi lokasi';
