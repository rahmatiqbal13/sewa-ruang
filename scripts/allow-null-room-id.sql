-- Allow room_inventories.room_id to be nullable
-- This enables importing inventory items without assigning a room upfront.
-- Room can be assigned later via the edit dialog.
ALTER TABLE public.room_inventories ALTER COLUMN room_id DROP NOT NULL;
