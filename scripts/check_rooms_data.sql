-- CEK DATA RUANGAN
-- Jalankan query ini di Supabase SQL Editor untuk memastikan data masih ada

-- 1. Cek total rooms
SELECT COUNT(*) as total_rooms FROM rooms;

-- 2. Cek rooms yang aktif
SELECT COUNT(*) as active_rooms FROM rooms WHERE is_active = true;

-- 3. Cek rooms yang dinonaktifkan
SELECT COUNT(*) as inactive_rooms FROM rooms WHERE is_active = false;

-- 4. Lihat semua data rooms
SELECT id, name, room_code, building_id, floor, capacity, room_type, is_active, created_at
FROM rooms
ORDER BY created_at DESC;

-- 5. Cek apakah ada foreign key constraint yang menyebabkan cascade delete
-- (Tidak seharusnya ada, tapi untuk memastikan)
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'rooms' OR ccu.table_name = 'rooms');
