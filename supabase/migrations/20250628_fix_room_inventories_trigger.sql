-- Fix: Trigger error on room_inventories table
-- Error: record "new" has no field "updated_at"
-- Root cause: room_inventories has "last_updated_at" not "updated_at"
-- Run this in Supabase SQL Editor (safe for existing databases)

-- Drop broken trigger
DROP TRIGGER IF EXISTS update_room_inventories_updated_at ON public.room_inventories;

-- Create new function for last_updated_at (idempotent)
CREATE OR REPLACE FUNCTION public.update_room_inventories_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
DROP TRIGGER IF EXISTS update_room_inventories_last_updated ON public.room_inventories;
CREATE TRIGGER update_room_inventories_last_updated
  BEFORE UPDATE ON public.room_inventories
  FOR EACH ROW EXECUTE FUNCTION public.update_room_inventories_last_updated();
