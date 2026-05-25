# USC OPENCODE IMPLEMENTATION PROMPT
## Sewa Ruang & Alat — Universitas Negeri Surabaya
**Untuk:** OpenCode · Claude Code · Aider · Cursor · Terminal AI Agent
**Tujuan:** Implementasi redesign ke project Next.js yang sudah ada
**Versi:** 2026

---

## ⚠️ CARA PAKAI DI OPENCODE

1. Buka terminal di root folder project `sewa-ruang`
2. Jalankan: `opencode` (atau model pilihan kamu)
3. **Mulai dengan INIT PROMPT** — wajib di awal sesi
4. Lanjut ke prompt per halaman sesuai urutan
5. Gunakan **Plan Mode dulu**, baru **Build Mode** untuk eksekusi
6. Commit ke git setelah setiap halaman selesai

---

## ══════════════════════════════════════
## INIT PROMPT — KONTEKS PROJECT
## (Jalankan sekali di awal sesi)
## ══════════════════════════════════════

```
You are working on an existing Next.js 15 project called "Sewa Ruang & Alat USC"
located in the current directory.

PROJECT CONTEXT:
- University laboratory room & equipment rental system
- Institution: Universitas Negeri Surabaya (UNESA)
- Stack: Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase, shadcn/ui
- DB: PostgreSQL via Supabase (NOT MySQL)
- Auth: Supabase Auth (cookie-based session)
- Deployment: Vercel
- Frontend port: 5175, Backend port: 3003

USER ROLES: super_admin, admin, staff, borrower
ADMIN ROUTES: /admin/* (use createAdminClient for Supabase service role)
PUBLIC ROUTES: /, /catalog, /login, /register
BORROWER ROUTES: /dashboard, /bookings/*, /booking/*

CRITICAL SUPABASE RULES:
- Admin pages: always use createAdminClient from @/lib/supabase/server
- Bookings FK hint: always use users!user_id(...) NOT users(...)
- booking_items has NO 'price' column — use booking.total_amount
- RLS: never use recursive subquery to users table in USING clause

2026 DESIGN SYSTEM TO APPLY:
Colors:
  --primary: #1B3A8C
  --primary-dark: #0F2A6B
  --primary-soft: #EAF0FF;
  --accent: #F5B800;
  --accent-dark: #D4A000;
  --accent-soft: #FEF9E7;
  --success: #10B981
  --warning: #F59E0B
  --danger: #EF4444
  --info: #3B82F6
  --surface: #F9FAFB
  --border: #E5E7EB
  --text-primary: #111827
  --text-body: #374151
  --text-muted: #6B7280

Typography: DM Sans (primary), DM Mono (booking reference codes)
Card style: white · rounded-[14px] · border border-[#E5E7EB] · 
  shadow-[0_2px_8px_rgba(0,0,0,0.06)]
Status badges: rounded-full pill, color-coded per status

STATUS BADGE CLASSES:
pending:   bg-[#FEF3C7] text-[#92400E]
approved:  bg-[#DBEAFE] text-[#1E40AF]
paid:      bg-[#D1FAE5] text-[#065F46]
completed: bg-[#F3F4F6] text-[#374151]
rejected:  bg-[#FEE2E2] text-[#991B1B]
cancelled: bg-[#E5E7EB] text-[#6B7280]

Before making any changes:
1. Read the existing file structure
2. Understand existing Supabase queries and types
3. Plan the changes in Plan Mode first
4. Only then implement in Build Mode

Confirm you understand the project context before proceeding.
```

---

## ══════════════════════════════════════
## PROMPT 1 — GLOBAL SETUP
## (Jalankan sebelum halaman apapun)
## ══════════════════════════════════════

```
TASK: Set up global design system and shared components.
Use Plan Mode to review, then Build Mode to implement.

Steps:

1. INSTALL FONT
   In app/layout.tsx, add DM Sans and DM Mono via next/font:
   import { DM_Sans, DM_Mono } from 'next/font/google'
   Apply as CSS variables: --font-sans, --font-mono
   Update tailwind.config.ts to use these font variables

2. ADD CSS VARIABLES
   In app/globals.css, add:
   :root {
     --primary: #1B3A8C;
     --primary-dark: #0F2A6B;
     --primary-soft: #EAF0FF;
  --accent: #F5B800;
  --accent-dark: #D4A000;
  --accent-soft: #FEF9E7;;
     --success: #10B981;
     --warning: #F59E0B;
     --danger: #EF4444;
     --info: #3B82F6;
     --surface: #F9FAFB;
     --border-color: #E5E7EB;
     --text-primary: #111827;
     --text-body: #374151;
     --text-muted: #6B7280;
   }

3. CREATE SHARED COMPONENTS
   Create these files if they don't exist yet:

   a) components/ui/status-badge.tsx
      Props: status: 'pending'|'approved'|'paid'|'completed'|'rejected'|'cancelled'
      Returns: <span> with correct Tailwind bg + text color classes
      Label map in Indonesian:
        pending → "Menunggu Persetujuan"
        approved → "Disetujui"
        paid → "Lunas"
        completed → "Selesai"
        rejected → "Ditolak"
        cancelled → "Dibatalkan"

   b) components/ui/stat-card.tsx
      Props: title, value, subtitle, icon, color ('blue'|'green'|'orange'|'red'|'purple')
      Style: white card, left border 4px with color, icon circle with 10% opacity bg
      Tailwind: rounded-[14px] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.06)]

   c) components/ui/soft-card.tsx
      Props: children, className?
      Wrapper card: white, rounded-[14px], border, shadow, p-5

4. UPDATE tailwind.config.ts
   Add custom colors matching the design system tokens above.
   Add font family: sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans]

Do NOT modify any existing Supabase queries or business logic.
Only add/modify styling and create new shared components.
```

---

## ══════════════════════════════════════
## PROMPT 2 — LANDING PAGE
## Route: /  (app/page.tsx)
## ══════════════════════════════════════

```
TASK: Redesign the landing page at app/page.tsx
This is a public page — no Supabase queries needed.
Use 'use client' only if needed for mobile menu toggle.

SECTIONS TO BUILD (in order):

1. NAVBAR (sticky, height 64px)
   - White bg, border-bottom border-[#E5E7EB], shadow-sm
   - Left: purple square "USC" icon + "Sewa Ruang & Alat" DM Sans bold
   - Center: nav links Beranda | Katalog | Cara Peminjaman | Kontak
     (text-[#374151] hover:text-[#1B3A8C] text-sm)
   - Right: "Masuk" ghost + "Daftar Sekarang" bg-[#1B3A8C] text-white rounded-lg
   - Mobile: hamburger → slide-down menu with useState toggle

2. HERO (min-h-[80vh])
   - bg: bg-gradient-to-br from-[#1B3A8C] to-[#2A52C9]
   - 2 column: left text (55%) + right illustration (45%)
   - Left: eyebrow text white/60% + H1 white 42px + subtext white/80% +
     2 CTA buttons + 3 trust badges
   - Right: placeholder div with geometric shapes using pure CSS/SVG
     (no external images) — floating cards with CSS animation
   - Mobile: single column, illustration below

3. STATS ROW (py-12)
   - White bg, 4 stat items in a row
   - Each: colored number + label + icon
   - Data: 20+ Ruangan (blue) | 100+ Peralatan (green) |
     500+ Peminjaman (purple) | 98% Kepuasan (orange)
   - Mobile: 2×2 grid

4. CARA MEMINJAM (py-20 bg-[#F9FAFB])
   - 3 steps horizontal with arrow connectors
   - Step circles: numbered, purple/indigo/green
   - Mobile: vertical timeline with left border

5. KATALOG PREVIEW (py-20)
   - Tab toggle: Ruangan | Peralatan (useState)
   - 3-col card grid with placeholder cards (static data, no Supabase)
   - "Lihat Semua Katalog" link to /catalog

6. KATEGORI PEMINJAM (py-20 bg-[#EFF3FF])
   - 6 cards: Mahasiswa S1 | S2 | Dosen | Staff | Mitra MOU | Umum
   - Each: colored icon + label + short desc

7. FITUR UNGGULAN (py-20)
   - Asymmetric 2-column bento grid
   - 3 feature cards

8. CTA BANNER (rounded-2xl gradient bg)
   - Centered text + button

9. FOOTER (bg-[#111827])
   - 3 columns + bottom copyright bar

IMPORTANT:
- No Supabase calls on this page (it's public static content)
- Use Next.js Link for all internal navigation
- All images: use placeholder divs with CSS (no <img> tags)
- Fully responsive with Tailwind breakpoints (sm: md: lg:)
- Export as default async server component (no 'use client' 
  unless needed for mobile menu)
```

---

## ══════════════════════════════════════
## PROMPT 3 — AUTH PAGES
## Routes: /login · /register
## ══════════════════════════════════════

```
TASK: Redesign auth pages.
Read existing files first: app/login/page.tsx, app/register/page.tsx
Preserve ALL existing Supabase Auth logic — only change the UI.

LOGIN PAGE REDESIGN (app/login/page.tsx):
Layout change: single column → 2-panel split on desktop

Left panel (40%, hidden on mobile):
  - bg-gradient-to-br from-[#1B3A8C] to-[#2A52C9]
  - USC logo + system name white
  - 3 feature bullet points with icons
  - Subtle geometric pattern overlay (CSS only)

Right panel (60% desktop / 100% mobile):
  - White bg, centered form max-w-[400px]
  - "Selamat Datang Kembali" H2
  - Email field with mail icon (keep existing onChange handlers)
  - Password field with eye toggle (keep existing state)
  - "Lupa Password?" link right-aligned
  - Primary submit button full-width (keep existing onSubmit)
  - "Daftar Sekarang" link

KEEP INTACT:
  - All useRouter, useState, supabase.auth.signInWithPassword logic
  - All error handling and toast notifications
  - Loading state on button

REGISTER PAGE REDESIGN (app/register/page.tsx):
Layout: centered card max-w-[560px] on bg-[#F9FAFB]

Card: white, rounded-2xl, Soft UI shadow, p-10

Keep all existing form fields and add:
  - USC logo header + title
  - Step indicator (3 dots, visual only — not actual multi-step)
  - Group fields in 2-col grid where applicable:
    Email | Password (2-col)
    WhatsApp | Telegram (2-col)
  - Style select dropdown for kategori peminjam
  - Primary submit button full-width

KEEP INTACT:
  - All form state (useState for each field)
  - supabase.auth.signUp() call
  - plain_password save logic
  - All validation and error handling
  - Success redirect logic
```

---

## ══════════════════════════════════════
## PROMPT 4 — BORROWER DASHBOARD
## Route: /dashboard
## ══════════════════════════════════════

```
TASK: Redesign borrower dashboard at app/dashboard/page.tsx
Read the existing file first. Preserve all Supabase queries.

LAYOUT CHANGES:

1. HEADER BAR
   Current: [read existing header structure]
   New: white bg · border-bottom · height 60px
     Left: USC logo small
     Right: notification bell (check if notifications exist) + user avatar

2. GREETING CARD (new component)
   bg-gradient-to-r from-[#1B3A8C] to-[#2A52C9]
   rounded-2xl · mx-4 · mt-3 · p-5
   "Selamat datang, {user.name} 👋" white bold
   "{user.category_label}" white/70%
   Fetch user data from existing query — just restyle the display

3. QUICK ACTION GRID (2×2, new)
   4 action cards: Ajukan Peminjaman | Katalog | Riwayat | Upload Bukti
   Each: rounded-xl · colored soft bg · icon + label
   Links to: /booking/new | /catalog | /bookings | /booking/{id}/upload-proof
   Note: only show "Upload Bukti" if there is an approved booking

4. ACTIVE BOOKING CARD
   Find existing active booking display component
   Restyle: white card · Soft UI shadow · left border 4px
     Green border if status=paid, Orange if status=approved
   Show: booking ref (DM Mono) · asset name · date range · time
   Action buttons: keep existing onClick handlers, just restyle buttons

5. RECENT BOOKINGS LIST
   Find existing bookings list component
   Restyle each item as a list row:
     Left: status dot + icon circle
     Center: asset name bold + ref DM Mono small
     Right: StatusBadge component + date
   Keep existing data fetch (Supabase query) intact
   Use the new StatusBadge component from Prompt 1

6. MOBILE BOTTOM NAV (new, 'use client')
   Fixed bottom · white · border-top · height 60px · safe-area
   4 tabs: Beranda(/dashboard) | Booking(/bookings) | 
     Pembayaran(/booking/[id]/payment) | Profil(/profile)
   Active detection via usePathname()
   Show only on mobile (hidden md:hidden)

7. DESKTOP SIDEBAR
   If desktop: show existing sidebar layout
   Add profile card at bottom of sidebar
   Style active menu item: bg-[#EAF0FF] text-[#1B3A8C] 
     border-l-[3px] border-[#1B3A8C]

DO NOT CHANGE:
  - Any Supabase query or data fetching logic
  - Any existing useEffect hooks
  - Any booking data types or interfaces
  - Redirect/navigation logic
```

---

## ══════════════════════════════════════
## PROMPT 5 — BOOKING FORM
## Routes: /booking/new · steps
## ══════════════════════════════════════

```
TASK: Redesign booking form at app/booking/new/page.tsx
Read existing file first. This is complex — use Plan Mode thoroughly.

STEP INDICATOR (top of all steps):
New component: components/booking/StepIndicator.tsx
Props: currentStep: 1 | 2 | 3
3 nodes connected by lines:
  Done: green circle with checkmark
  Active: purple filled circle + label purple bold
  Inactive: gray outline circle + label gray
Line between nodes: gray, done portion turns purple

STEP 1 — ASSET SELECTION:
Keep all existing asset fetching from Supabase.
Restyle:
  - Tab toggle: Ruangan | Peralatan (keep existing state)
  - Room cards: Soft UI cards, 2-col grid
    Photo placeholder · status badge · name · type badge · 
    capacity · price purple · [Pilih] button
    Selected state: purple border-2 + bg-[#EFF3FF] + green checkmark
  - Equipment cards: similar + quantity selector (─ N ＋)
    Keep existing quantity state management
  - Selected summary bar: sticky bottom
    Show selected items + [Lanjut →] primary button
    Keep existing validation (at least 1 item selected)

STEP 2 — SCHEDULE:
Keep all existing date/time state.
Restyle:
  - Date inputs: styled with calendar icon, keep existing onChange
  - Time inputs: keep existing time constraints (08.00–22.00)
  - Tujuan textarea: min-h-[100px] + char counter
  - Add desktop sidebar showing live price estimate
    (calculate from selected items × hours, display as estimate)
  - Keep existing form validation

STEP 3 — CONFIRMATION:
Keep all existing submission logic.
Restyle summary card sections:
  - Data Peminjam section: avatar + name + category + contact info
  - Aset Dipinjam section: item rows with price
  - Pembayaran section: VA number styled with DM Mono + purple bg pill
  - Total section: large purple amount
Keep existing:
  - Terms checkbox state
  - Submit handler (API call)
  - Success state redirect
  - Error handling

SUCCESS STATE:
Restyle the success screen:
  Green checkmark (CSS animated circle + check)
  Booking ref in DM Mono purple
  Email confirmation note
  Two action buttons

IMPORTANT: This form likely has complex state management.
  Do NOT refactor state — only change JSX/className.
  Keep all existing API calls and navigation intact.
```

---

## ══════════════════════════════════════
## PROMPT 6 — ADMIN DASHBOARD
## Route: /admin/dashboard
## ══════════════════════════════════════

```
TASK: Redesign admin dashboard at app/admin/dashboard/page.tsx
Read existing file carefully. Preserve ALL Supabase queries.

LAYOUT STRUCTURE:
2-column layout: sidebar (240px) + main content

ADMIN SIDEBAR (new shared component):
Create: components/admin/AdminSidebar.tsx
'use client' for active state detection via usePathname()

Structure:
  Logo zone (h-16, gradient bg-[#1B3A8C] to [#2A52C9]):
    "USC" white bold + "Admin Panel" white/70% small
  
  Nav sections with labels:
    UTAMA: Dashboard · Peminjaman · Pembayaran · Pengembalian
    MASTER DATA: Ruangan · Peralatan · Gedung · Inventaris
    LAPORAN: Laporan · Log Aktivitas
    SISTEM: Pengguna (super_admin only) · Notifikasi · Pengaturan · Sampah
  
  Each nav item:
    Default: flex items-center gap-3 · px-4 py-2.5 · rounded-lg · text-[#6B7280]
    Active: bg-[#EAF0FF] · text-[#1B3A8C] · border-l-3 border-[#1B3A8C]
    Icon: 20px (use lucide-react icons)
    Badge: if pending/overdue count > 0, show colored count badge
  
  Bottom: user profile card
    Avatar circle initials purple · name bold · role badge · logout button

MAIN CONTENT TOP BAR:
  h-16 · white · border-bottom · px-6 · flex items-center justify-between
  Left: page title H3 + greeting gray small
  Right: search icon · bell icon (keep existing notification logic) · avatar

BENTO STAT CARDS (4 in a row, gap-6):
Use new StatCard component from Prompt 1.
Data source: keep ALL existing Supabase count queries.
Just pass data to StatCard props:
  1. Total Peminjaman (blue) — existing totalCount query
  2. Menunggu Persetujuan (orange) — existing pendingCount query
     Add "SEGERA" red badge if value > 5
  3. Menunggu Verifikasi (yellow) — existing verifyCount query
  4. Terlambat Kembali (red) — existing overdueCount query
     Add pulsing red dot if value > 0

NOTIFICATION PANEL:
Read existing NotificationBell or notification logic.
Inline panel below stats (collapsible with useState):
  4 rows with colored left borders:
    Red: overdue items
    Orange: due today
    Yellow: pending approvals
    Green: new members
  Each row: dot · message · detail · timestamp · action link

2-COLUMN BENTO CONTENT:
Left 65%: Recent Bookings table card
  Keep existing Supabase query for recent bookings
  Restyle as table with:
    Filter bar (Status dropdown + search input)
    Table with columns: Ref · Peminjam · Aset · Date · Status · Aksi
    Use StatusBadge component for status column
    Pagination (keep existing pagination logic)

Right 35%: 2 stacked cards
  TOP: Asset availability (keep existing room/equipment count queries)
    Progress bars: rooms available / total, equipment available / total
  BOTTOM: Today's schedule (keep existing today's bookings query)
    Timeline list: time · asset · borrower · status badge

MOBILE:
  Bottom nav 5 tabs (new component: components/admin/AdminBottomNav.tsx)
  Stat cards: 2×2 compact
  Table → card list format

DO NOT CHANGE:
  - createAdminClient usage (keep service role)
  - Any Supabase queries
  - Notification Bell component logic
  - Any server/client component boundaries
```

---

## ══════════════════════════════════════
## PROMPT 7 — ADMIN BOOKING MANAGEMENT
## Route: /admin/bookings
## ══════════════════════════════════════

```
TASK: Redesign /admin/bookings page and booking detail sheet.
Files to read: app/admin/bookings/BookingsList.tsx, 
  app/admin/bookings/page.tsx, app/admin/bookings/[id]/page.tsx

STATUS TABS:
Add tab row above filter bar (keep existing status filter state):
  Semua · Pending · Approved · Paid · Completed · Rejected
  Each tab shows count from existing query
  Active tab: border-b-2 border-[#1B3A8C] text-[#1B3A8C] font-semibold
  Clicking tab sets the existing status filter state

FILTER BAR:
Restyle existing filter inputs as a white Soft UI card row:
  Keep existing: status select · kategori select · date range · search input
  Add: [Reset Filter] ghost button that clears all filters
  Wrap in: white card rounded-xl border border-[#E5E7EB] p-4

BOOKINGS TABLE:
Keep existing data fetch (all Supabase queries + pagination).
Restyle the table:
  - Add checkbox column (bulk selection state)
  - Ref column: DM Mono font text-[#1B3A8C]
  - Peminjam column: avatar circle initials + name
  - Aset column: max 2 colored pills, "+N lagi" if more
  - Status column: use StatusBadge component
  - Aksi column: [Lihat] ghost SM + [⋮] dropdown menu
  - Overdue rows: border-l-3 border-[#EF4444] bg-[#FFF5F5]
  - Row hover: bg-[#FAFAFA]

BULK ACTION BAR (new, 'use client'):
Appears above table when checkboxes selected:
  "N item dipilih" purple · [Setujui] [Tolak] [Export] [Hapus]
  Only show actions matching current user role

BOOKING DETAIL SHEET:
Read existing: UserDetailSheet pattern or BookingDetailSheet if exists.
Restyle as shadcn Sheet component (from right, 420px):
  Use <Sheet>, <SheetContent>, <SheetHeader> from shadcn

  Sections in scroll area:
    PEMINJAM: avatar + name + category badge + contact buttons
      Keep existing ContactButtons component (Email/WA/Telegram)
    ASET: list each booked item with date + price
      Keep existing booking_items query
    PEMBAYARAN: method + VA number (DM Mono purple pill) + proof thumbnail
      Keep existing payment_proofs query
    STATUS TIMELINE: vertical steps
      Derive from booking.status + timestamps
    CATATAN ADMIN: keep existing notes field (editable if admin)

  STICKY ACTION FOOTER (border-top):
    Conditional buttons based on status:
      pending → [✓ Setujui] green + [✗ Tolak] red
      approved + proof uploaded → [✓ Verifikasi Bayar] purple
      paid → [↩ Catat Pengembalian] blue
    Always show: [WA] [Email] [PDF] icon buttons row
    Keep ALL existing onClick handlers — only restyle buttons

MOBILE:
  Card list format (not table)
  Each card: ref mono + name + status badge + [Lihat] ghost
  FAB: fixed bottom-right purple circle [+] → /admin/bookings/new
  Sheet becomes bottom sheet on mobile (full width)

IMPORTANT:
  - Keep ALL existing server actions and API calls
  - Keep existing approval/rejection handlers
  - Keep existing PDF download logic
  - Keep existing WhatsApp/Email send handlers
  - Keep createAdminClient usage on server components
  - users!user_id() hint must stay in all booking queries
```

---

## ══════════════════════════════════════
## PROMPT 8 — PUBLIC CATALOG
## Route: /catalog
## ══════════════════════════════════════

```
TASK: Redesign public catalog at app/catalog/page.tsx
Read existing file. Keep all Supabase queries for rooms and equipment.

PAGE HEADER:
Above the main content, below navbar.
bg-[#EFF3FF] · py-14 · text-center
Title: "Katalog Ruang & Alat" H1 bold #111827
Subtitle: gray 16px
Search bar: centered · max-w-[560px] · rounded-full · white · Soft UI shadow · h-13
  Keep existing search state and filter logic
  Just restyle the input

MAIN LAYOUT:
Desktop: flex row — sidebar 260px + grid flex-1 · gap-8
Mobile: single column, filter via bottom sheet

FILTER SIDEBAR (desktop only):
White Soft UI card · sticky top-24 · p-5 · space-y-6

Sections (keep existing filter state for each):
  TIPE ASET: radio group — Semua | Ruangan | Peralatan
  GEDUNG: checkbox list (from existing buildings query)
  KATEGORI ALAT: checkbox list (enum values)
  HARGA: range slider if exists, or two number inputs
  KAPASITAS: checkbox ranges (1-10, 11-30, 31-50, 50+)
  STATUS: "Tampilkan tersedia saja" checkbox

Keep all existing filter state and filter application logic.
Only restyle the filter UI components.

MOBILE FILTER (new):
Filter button top: [⚙ Filter] ghost button with active count badge
Opens shadcn Sheet from bottom: same filter content in scroll area

CATALOG GRID:
Tab row: Semua | Ruangan (count) | Peralatan (count)
  Keep existing tab/type filter state
Sort dropdown: keep existing sort state

3-col desktop / 2-col tablet / 1-col mobile · gap-6

ROOM CARDS:
Keep existing rooms data from Supabase query.
Restyle each card:
  Photo zone (16:9 · rounded-t-[14px]):
    If room.photo_url exists: <Image> with object-cover
    Else: placeholder div bg-[#F3F4F6] with building icon
    Status badge overlay top-right:
      "Tersedia" bg-green-500 OR "Sedang Digunakan" bg-red-500
  Body px-4 py-4:
    Building pill gray small
    Room name H3 bold
    Type badge colored pill
    Specs: capacity + size if available
    Price: text-[#1B3A8C] semibold (from room_rates — use borrower category)
    Price note with "Lihat semua tarif" link
  Footer: [Lihat Detail] ghost full-width → opens detail modal

EQUIPMENT CARDS:
Keep existing equipment data from Supabase.
Similar restyle: photo (1:1) + category pill + name + brand + price + stock bar

DETAIL MODAL:
Use shadcn Dialog component.
Content:
  Image (if exists) or placeholder
  Name + badges
  Specs grid
  Tariff table: all room_rates / equipment_rates per user category
  Availability: placeholder calendar or existing availability check
  [Ajukan Peminjaman] → redirect to /booking/new with preselected item
    (keep existing logic if pre-selection is implemented)
  Login note if user is not authenticated (check existing auth state)

DO NOT CHANGE:
  - Supabase queries for rooms, equipment, buildings
  - room_rates / equipment_rates fetching
  - Auth state check for "Ajukan Peminjaman" button
  - Search and filter logic (only restyle the UI)
  - Pagination if it exists
```

---

## ══════════════════════════════════════
## TIPS OPENCODE UNTUK PROJECT INI
## ══════════════════════════════════════

### Urutan yang Disarankan
```
1. Init Prompt (konteks project)
2. Prompt 1: Global Setup (font, CSS vars, shared components)
3. Prompt 2: Landing Page (paling safe, no Supabase)
4. Prompt 3: Auth Pages (UI only, logic intact)
5. Prompt 6: Admin Dashboard (paling sering dipakai admin)
6. Prompt 7: Admin Booking Management
7. Prompt 4: Borrower Dashboard
8. Prompt 5: Booking Form (paling kompleks, hati-hati)
9. Prompt 8: Public Catalog
```

### Workflow yang Aman
```bash
# Sebelum mulai setiap prompt:
git add -A && git commit -m "checkpoint before [halaman]"

# Di OpenCode — selalu Plan Mode dulu:
"Plan only, don't build yet: [paste prompt]"

# Review plan, lalu:
"Looks good, proceed with Build Mode"

# Setelah selesai:
git add -A && git commit -m "redesign: [halaman] - 2026 Soft UI"
```

### Jika OpenCode Salah
```
"Revert the last change to [filename], 
the Supabase query was broken.
Only change the JSX/className, not the data fetching logic."
```

### Prompt Debugging Cepat
```
"The status badge colors are wrong on /admin/bookings.
Apply these Tailwind classes based on status:
  pending: bg-[#FEF3C7] text-[#92400E]
  approved: bg-[#DBEAFE] text-[#1E40AF]
  paid: bg-[#D1FAE5] text-[#065F46]
  completed: bg-[#F3F4F6] text-[#374151]
  rejected: bg-[#FEE2E2] text-[#991B1B]"
```

---

*USC OpenCode Implementation Prompt 2026*
*Sewa Ruang & Alat — Direktorat Unesa Science Center*
*Gunakan bersama: USC_Design_Prompt_Stitch_v0.md*
