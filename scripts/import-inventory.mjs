#!/usr/bin/env node
// Usage:
//   1. Save the CSV as scripts/inventory-barang.csv
//   2. node scripts/import-inventory.mjs
//   3. Review scripts/import-inventory.sql, then run in Supabase SQL Editor

import { readFileSync, writeFileSync } from 'fs'

// ─── CSV parser (handles quoted fields with embedded commas/quotes) ──────────
function parseCSVLine(line) {
  const fields = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { fields.push(field.trim()); field = '' }
      else field += ch
    }
  }
  fields.push(field.trim())
  return fields
}

// ─── Condition mapping ───────────────────────────────────────────────────────
function mapCondition(status) {
  const s = (status || '').trim()
  if (s === 'Rusak')       return 'damaged'
  if (s === 'Kurang Baik') return 'needs_repair'
  return 'good' // Baik or empty → good
}

// ─── SQL helpers ─────────────────────────────────────────────────────────────
function sqlStr(v) {
  if (!v) return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

// ─── Room name → WHERE clause for assets table ───────────────────────────────
function roomWhere(lokasi) {
  const fixed = {
    'Lobby USC':    "name ILIKE '%Lobby%'",
    'R. Pameran':   "name ILIKE '%Pameran%'",
    'R. Server':    "name ILIKE '%Server%'",
    'R. Media':     "name ILIKE '%Media%'",
    'R. Direktur':  "name ILIKE '%Direktur%'",
    'R. Tamu':      "name ILIKE '%Tamu%'",
    'R. Sekretaris':"name ILIKE '%Sekretaris%'",
    'R. Gamers':    "name ILIKE '%Gamer%'",
    'R. Workshop':  "name ILIKE '%Workshop%'",
    'Mushola':      "name ILIKE '%Mushola%' OR name ILIKE '%Musola%'",
    'Luar Ruangan': "name ILIKE '%Luar%' OR name ILIKE '%Outdoor%'",
  }
  if (fixed[lokasi]) return fixed[lokasi]
  // Numbered rooms: R. 214, R. 217, etc. — room_code may have prefix like LAB214
  const m = lokasi.match(/R\.\s*(\d+)/)
  if (m) {
    const n = m[1]
    return `(room_code = '${n}' OR room_code ILIKE '%${n}' OR name ILIKE '%${n}%' OR name ILIKE '%R.${n}%' OR name ILIKE '%R. ${n}%')`
  }
  return `name ILIKE '%${lokasi.replace(/'/g, "''")}%'`
}

// ─── Parse CSV ───────────────────────────────────────────────────────────────
const content = readFileSync('scripts/inventory-barang.csv', 'utf8')
const lines = content.split(/\r?\n/)
// Header: Code,Nama Barang,Merk,Jumlah,Total,Status,Sumber,Lokasi,Lantai,Satuan,Foto Real,Keterangan
//         0    1           2    3      4     5      6      7      8      9      10         11

const rows = []
for (let i = 1; i < lines.length; i++) {
  const f = parseCSVLine(lines[i])
  const name   = f[1]?.trim()
  const lokasi = f[7]?.trim()
  if (!name || !lokasi) continue

  rows.push({
    name,
    merk:       f[2]?.trim()  || null,
    status:     f[5]?.trim()  || 'Baik',
    sumber:     f[6]?.trim()  || null,
    lokasi,
    satuan:     f[9]?.trim()  || null,
    keterangan: f[11]?.trim() || null,
  })
}

// ─── Group by (name, lokasi, condition) ─────────────────────────────────────
// Items with same name+room+condition are merged (qty = row count)
// Items with same name+room but different conditions become separate rows
const groups = new Map()
for (const row of rows) {
  const condition = mapCondition(row.status)
  const key = `${row.name}||${row.lokasi}||${condition}`
  if (!groups.has(key)) {
    groups.set(key, {
      name: row.name, lokasi: row.lokasi, condition,
      merk: row.merk, sumber: row.sumber, satuan: row.satuan,
      notes_set: new Set(),
      qty: 0,
    })
  }
  const g = groups.get(key)
  g.qty++
  if (row.keterangan) g.notes_set.add(row.keterangan)
  if (!g.merk   && row.merk)   g.merk   = row.merk
  if (!g.sumber && row.sumber) g.sumber = row.sumber
}

// ─── Group by location ───────────────────────────────────────────────────────
const byLokasi = new Map()
for (const g of groups.values()) {
  if (!byLokasi.has(g.lokasi)) byLokasi.set(g.lokasi, [])
  byLokasi.get(g.lokasi).push(g)
}

// ─── Generate SQL ────────────────────────────────────────────────────────────
let sql = `-- ================================================================
-- Impor Inventaris Barang — Sports Center
-- Dibuat otomatis dari: Inventaris Sports Center - Barang Inventaris.csv
-- ================================================================
--
-- SEBELUM MENJALANKAN:
-- Pastikan nama ruangan cocok. Cek daftar ruangan Anda:
--   SELECT id, name, room_code FROM assets WHERE category = 'room' ORDER BY name;
-- Sesuaikan kondisi WHERE di bawah jika nama ruangan berbeda.
--
-- Lokasi ditemukan: ${byLokasi.size}
-- Total jenis item: ${groups.size}
-- ================================================================

DO $$
DECLARE
  r_id UUID;
BEGIN
`

for (const [lokasi, items] of byLokasi) {
  sql += `\n  -- ========== ${lokasi} (${items.length} jenis item) ==========\n`
  sql += `  SELECT id INTO r_id\n`
  sql += `  FROM   assets\n`
  sql += `  WHERE  category = 'room' AND (${roomWhere(lokasi)})\n`
  sql += `  LIMIT  1;\n\n`
  sql += `  IF r_id IS NOT NULL THEN\n`

  for (const item of items) {
    // Build notes
    const parts = []
    if (item.merk)   parts.push(`Merk: ${item.merk}`)
    if (item.sumber) parts.push(`Sumber: ${item.sumber}`)
    if (item.satuan && item.satuan !== 'Unit') parts.push(`Satuan: ${item.satuan}`)
    for (const k of item.notes_set) parts.push(k)
    const notes = parts.length > 0 ? parts.join(' | ') : null

    sql += `    INSERT INTO public.room_inventory_items\n`
    sql += `      (room_asset_id, name, quantity, condition, notes, is_active, last_updated_at)\n`
    sql += `    VALUES\n`
    sql += `      (r_id, ${sqlStr(item.name)}, ${item.qty}, '${item.condition}', ${sqlStr(notes)}, true, NOW());\n`
  }

  sql += `  ELSE\n`
  sql += `    RAISE NOTICE 'RUANGAN TIDAK DITEMUKAN: ${lokasi}';\n`
  sql += `  END IF;\n`
}

sql += `\nEND $$;\n`

writeFileSync('scripts/import-inventory.sql', sql)
console.log(`✓ Generated: scripts/import-inventory.sql`)
console.log(`  Lokasi  : ${byLokasi.size}`)
console.log(`  Item    : ${groups.size} jenis`)
console.log('\nLokasi yang diproses:')
for (const [lokasi, items] of byLokasi) {
  console.log(`  - ${lokasi} (${items.length} item)`)
}
