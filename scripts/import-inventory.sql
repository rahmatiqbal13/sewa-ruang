-- ================================================================
-- Impor Inventaris Barang — Sports Center
-- Dibuat otomatis dari: Inventaris Sports Center - Barang Inventaris.csv
-- ================================================================
--
-- SEBELUM MENJALANKAN:
-- Pastikan nama ruangan cocok. Cek daftar ruangan Anda:
--   SELECT id, name, room_code FROM assets WHERE category = 'room' ORDER BY name;
-- Sesuaikan kondisi WHERE di bawah jika nama ruangan berbeda.
--
-- Lokasi ditemukan: 23
-- Total jenis item: 183
-- ================================================================

DO $$
DECLARE
  r_id UUID;
BEGIN

  -- ========== Lobby USC (3 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Lobby%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Cassete', 1, 'good', 'Merk: Hitachi', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Satpam Leter L', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Hitam Susun Futura', 3, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: Lobby USC';
  END IF;

  -- ========== R. Pameran (6 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Pameran%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tulisan SERC', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sofa Pendek', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sofa Panjang', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Sofa', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kayu', 8, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kayu', 2, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Pameran';
  END IF;

  -- ========== R. Server (11 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Server%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kayu Panjang Hijau', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kayu Panjang Coklat', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Susun Futura Hitam', 6, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Susun Futura Merah', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Hitam', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sound System', 1, 'good', 'Satuan: Paket', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'TV LG Monitor CCTV', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Krisbow Besi Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'TV Polytron Kecil', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split 2PK', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Mesin Server', 1, 'good', 'Satuan: Paket', true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Server';
  END IF;

  -- ========== R. Media (18 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Media%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split 2PK', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Putih Pendek', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Tanpa Sandaran Tangan dan Roda', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Body Protector', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tripod Camera', 9, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Laci Camera Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Krisbow Besi Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'TV Polytron Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'TV Polytron Kecil', 1, 'damaged', 'Pecah LCD', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand TV Polytron', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih Besar', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Dry Cabinet Master Space', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Camera', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Koper Camera Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Koper Camera Besar', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Box Container 52L Biru', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Box Backdrop SERC Hitam', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Media';
  END IF;

  -- ========== R. Direktur (8 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Direktur%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split 2PK', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Panjang Coklat', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kayu Besar Direktur', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Tanpa Sandaran Tangan dan Roda', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Kayu Kecil 2 Pintu', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Kayu 2 Susun', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Stainlis 2 Susun', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kayu Kecil', 2, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Direktur';
  END IF;

  -- ========== R. Tamu (11 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Tamu%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split 2PK', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sofa Panjang', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sofa Pendek', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sofa Kotak Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Krisbow Besi Putih', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Dispenser Philips', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Laci Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Alat AREC', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Alat FIREBALL', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand Jersey', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Manekin Jersey Slompn', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Tamu';
  END IF;

  -- ========== R. Sekretaris (20 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Sekretaris%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Sandaran Tangan Biasa', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Sandaran Tangan Elite', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kantor', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Putih Besar Susun 4', 1, 'good', 'Satuan: Pcs', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Putih Kecil Susun 3', 1, 'good', 'Satuan: Pcs', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Sepatu 1 Coklat Stora Susun', 1, 'good', 'Satuan: Pcs', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Sepatu 2 Coklat Stora Susun', 1, 'good', 'Satuan: Pcs', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Sepatu 3 Coklat Stora Susun', 1, 'good', 'Satuan: Pcs', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Sepatu Coklat Stora Susun', 3, 'good', 'Satuan: Pcs', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Sepatu Putih', 3, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Baju Portable', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Kaca Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Wattbike', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Kecil Susun 4', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Plate Chrono Jump', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand Laptop', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sepeda Lipat DAHON', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kipas Angin Kecil Berdiri', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Container Box Abu-Abu', 2, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Sekretaris';
  END IF;

  -- ========== R. Gamers (8 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Gamer%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'TV LG Sedang', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand tablet', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Laptop LOQ Lenovo', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand TV', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Nintendo Switch', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Wahoo', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'X-Banner SERC', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Gamers';
  END IF;

  -- ========== R. Workshop (26 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Workshop%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Besi Abu Muda', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Besi Abu Tua', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kantor Pendek', 4, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kantor Panjang', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Hitam Sandaran Tangan', 6, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Hitam Tanpa Sandaran Tangan', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Krisbow Besi Putih', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kulkas', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Dapur Coklat Besi Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Dispenser Philips', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Kecil 3 Loker Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Sedang 2 Loker Coklat', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kayu Panjang Coklat', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kayu Kecil Coklat', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Komputer', 1, 'good', 'Satuan: Paket', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Printer 1 Epson L3250', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Printer 2 Epson L3250', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Printer 3 Epson L3250', 1, 'damaged', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Printer 4 Epson L3250', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Printer 5 Epson L3250', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Cassete', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Proyektor 1 ViewSonic PJD5154', 1, 'good', 'Satuan: Paket', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Proyektor 2 Epson EB-E500', 1, 'good', 'Satuan: Paket', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih Besar', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Sound JBL 710', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. Workshop';
  END IF;

  -- ========== Mushola (2 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Mushola%' OR name ILIKE '%Musola%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Lemari Peralatan Sholat', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: Mushola';
  END IF;

  -- ========== R. 214 (2 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '214' OR name ILIKE '%214%' OR name ILIKE '%R.214%' OR name ILIKE '%R. 214%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Portabel Massase', 3, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 214';
  END IF;

  -- ========== R. 215 (2 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '215' OR name ILIKE '%215%' OR name ILIKE '%R.215%' OR name ILIKE '%R. 215%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Krisbow Besi Putih', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 215';
  END IF;

  -- ========== R. 216 (7 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '216' OR name ILIKE '%216%' OR name ILIKE '%R.216%' OR name ILIKE '%R. 216%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja dan Rak (sambung)', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Susun Putih', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kayu Coklat', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Futura', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Cermin Besar', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 216';
  END IF;

  -- ========== R. 217 (6 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '217' OR name ILIKE '%217%' OR name ILIKE '%R.217%' OR name ILIKE '%R. 217%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Cassete', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Panjang Coklat', 4, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Panjang Hitam', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Hitam Sandaran Tangan', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Susun Futura Hitam', 12, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 18, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 217';
  END IF;

  -- ========== R. 218 (6 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '218' OR name ILIKE '%218%' OR name ILIKE '%R.218%' OR name ILIKE '%R. 218%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'TV LG Sedang', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand TV', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Karpet Hitam', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 9, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 218';
  END IF;

  -- ========== R. 219 (4 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '219' OR name ILIKE '%219%' OR name ILIKE '%R.219%' OR name ILIKE '%R. 219%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 5, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Tanpa Sandaran Tangan', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 219';
  END IF;

  -- ========== R. 220 (10 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '220' OR name ILIKE '%220%' OR name ILIKE '%R.220%' OR name ILIKE '%R. 220%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 10, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kulkas Kecil Sharp', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Rak Stainlis Susun 2', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tangga Rehabilitasi', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Laci Kayu Kecil', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Laci Mini', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tempat P3K', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tempat Sampah Mini', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 220';
  END IF;

  -- ========== R. 221 (4 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '221' OR name ILIKE '%221%' OR name ILIKE '%R.221%' OR name ILIKE '%R. 221%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 5, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Tanpa Sandaran Tangan', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 221';
  END IF;

  -- ========== R. 222 (4 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '222' OR name ILIKE '%222%' OR name ILIKE '%R.222%' OR name ILIKE '%R. 222%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 23, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Warna Merah', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Lipat Biru', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 222';
  END IF;

  -- ========== R. 223 (4 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '223' OR name ILIKE '%223%' OR name ILIKE '%R.223%' OR name ILIKE '%R. 223%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 5, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Tanpa Sandaran Tangan', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 223';
  END IF;

  -- ========== R. 224 (5 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '224' OR name ILIKE '%224%' OR name ILIKE '%R.224%' OR name ILIKE '%R. 224%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 27, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Box Motorik', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Bed Portable Massage Hitam', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Papan Tulis Putih', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 224';
  END IF;

  -- ========== R. 225 (4 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND ((room_code = '225' OR name ILIKE '%225%' OR name ILIKE '%R.225%' OR name ILIKE '%R. 225%'))
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'AC Split', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 6, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kantor Tanpa Sandaran Tangan', 1, 'good', NULL, true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: R. 225';
  END IF;

  -- ========== Luar Ruangan (12 jenis item) ==========
  SELECT id INTO r_id
  FROM   assets
  WHERE  category = 'room' AND (name ILIKE '%Luar%' OR name ILIKE '%Outdoor%')
  LIMIT  1;

  IF r_id IS NOT NULL THEN
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Kayu', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kayu', 2, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Merah', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah', 3, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Kursi Kuliah Tanpa Meja', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'X-Banner', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tempat Sampah Biru', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Tempat Sampah Besar Kuning', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Appar', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Meja Tenis', 1, 'good', NULL, true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Stand Unis Bisnis', 1, 'good', 'Satuan: Paket', true, NOW());
    INSERT INTO public.room_inventory_items
      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)
    VALUES
      (r_id, 'Backdrop SERC', 1, 'good', 'Satuan: Paket', true, NOW());
  ELSE
    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: Luar Ruangan';
  END IF;

END $$;
