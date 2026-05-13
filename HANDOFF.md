# Handoff Notes — Sewa Ruang

## Status Deploy
- Production: https://sewa-ruang.vercel.app — LIVE dan berjalan
- GitHub repo: https://github.com/rahmatiqbal13/sewa-ruang (branch: main)
- Vercel auto-deploy dari GitHub TIDAK aktif (webhook putus). Gunakan `npx vercel --prod --yes` untuk deploy manual.

## Perbaikan yang sudah selesai (session ini)
1. **Slug URL migration** — semua URL sudah pakai nama (bukan UUID):
   - `/admin/buildings/[slug]/edit`
   - `/admin/rooms/[slug]` dan `/admin/rooms/[slug]/edit`
   - `/admin/inventory/[roomSlug]`
   - `/admin/qr` dan `/admin/qr/batch` — QR code URL pakai slug
   - `/rooms/[slug]` dan `/rooms/[slug]/inventory` (public)
   - `/equipment/[slug]/scan` (public) — **ini fix untuk blank page di QR scan**

2. **Profile save error** — DROP TRIGGER `update_users_updated_at` pada tabel `users` (sudah di-run di Supabase SQL Editor langsung)

3. **Hydration error** — `<button> cannot be descendant of <button>` di CatalogClient.tsx — fixed pakai Base UI `render={<Button />}` prop

4. **TypeScript errors (Vercel build)** — semua fixed:
   - `invoice/route.ts` — async params, supabase as any, puppeteer waitUntil + Buffer cast
   - `invoice/simple/route.ts` — async params, supabase as any
   - `logs/page.tsx` — searchParams as Promise, supabase as any
   - `reminders/process/route.ts` — supabase as any
   - `BookingReminders.tsx` — supabase as any
   - `DashboardAnalytics.tsx` — supabase as any + explicit callback types
   - `CatalogClient.tsx` — type predicate filter

5. **Vercel cron fix** — `vercel.json` cron diubah dari `0 * * * *` (per jam, butuh Pro) ke `0 8 * * *` (harian, cocok untuk Hobby)

6. **Supabase CLI** — `npm install -g supabase` sudah terinstall

## Yang BELUM selesai / perlu dicek
- Vercel GitHub webhook tidak auto-trigger. Perlu cek di Vercel dashboard → Settings → Git → apakah GitHub integration terhubung dengan benar. Atau gunakan `npx vercel --prod --yes` setiap kali deploy.
- Test fitur QR scan di production: buka `https://sewa-ruang.vercel.app/equipment/abdominal-crunch/scan` dan pastikan halaman tampil (sebelumnya blank karena code lama tidak ada slug lookup).

## Pattern penting

### Slug generation (dipakai di banyak file)
```typescript
function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
```

### Slug lookup pattern (semua halaman dynamic route)
```typescript
const { id: slug } = await params
const { data: allItems } = await sb.from('tablename').select('id, name')
const matched = allItems?.find((r: { id: string; name: string }) => createSlug(r.name) === slug)
if (!matched) notFound()
const id = matched.id
// gunakan id untuk query selanjutnya
```

### Deploy manual ke Vercel
```bash
npx vercel --prod --yes
```

### TypeScript fix untuk Supabase (tabel tidak ada di generated types)
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any
```

### Cek semua TypeScript error sebelum deploy
```bash
npx tsc --noEmit
```
