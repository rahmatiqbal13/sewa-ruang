-- Tambah kolom deleted_at untuk membedakan "dihapus user" vs "non-aktif operasional"
-- Kolom is_active tetap untuk status operasional (afkir, perawatan, dll)
-- Kolom deleted_at = NULL  → item normal (aktif maupun non-aktif)
-- Kolom deleted_at IS NOT NULL → item yang sengaja dihapus user (masuk Trash)

ALTER TABLE public.equipment
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE public.room_inventories
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;
