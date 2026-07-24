-- Add merk/type column to room_inventories
ALTER TABLE public.room_inventories
  ADD COLUMN IF NOT EXISTS merk TEXT;

COMMENT ON COLUMN public.room_inventories.merk IS 'Merk atau tipe barang, contoh: Samsung, Epson, dll';
