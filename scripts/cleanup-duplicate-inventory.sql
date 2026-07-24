-- Cleanup duplicate inventory items caused by import without room selection.
-- This removes items with room_id IS NULL whose name already exists in a room-assigned item.
--
-- STEP 1: Preview what will be deleted (run this first to verify)
SELECT ri.id, ri.name, ri.inventory_code, ri.merk, ri.quantity
FROM room_inventories ri
WHERE ri.room_id IS NULL
  AND ri.is_active = true
  AND LOWER(ri.name) IN (
    SELECT LOWER(name)
    FROM room_inventories
    WHERE room_id IS NOT NULL
      AND is_active = true
  )
ORDER BY ri.name;

-- STEP 2: After verifying the preview above, run this to delete the duplicates
-- (Uncomment the DELETE block below)
/*
DELETE FROM room_inventories
WHERE room_id IS NULL
  AND is_active = true
  AND LOWER(name) IN (
    SELECT LOWER(name)
    FROM room_inventories
    WHERE room_id IS NOT NULL
      AND is_active = true
  );
*/
