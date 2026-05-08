-- CEK DATA RUANGAN SEDERHANA
-- Jalankan ini di Supabase SQL Editor

-- Lihat semua rooms
SELECT * FROM rooms LIMIT 50;

-- Cek count
SELECT COUNT(*) FROM rooms;

-- Cek rooms aktif
SELECT COUNT(*) FROM rooms WHERE is_active = true;

-- Cek apakah ada constraint issue
SELECT 
    r.id,
    r.name,
    r.room_code,
    r.building_id,
    r.is_active,
    b.name as building_name
FROM rooms r
LEFT JOIN buildings b ON r.building_id = b.id
LIMIT 20;
