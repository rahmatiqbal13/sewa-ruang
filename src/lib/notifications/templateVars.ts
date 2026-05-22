// Maps booking data to template variables like {{nama}}, {{no_booking}}, etc.

const STATUS_LABELS: Record<string, string> = {
  pending:   'Menunggu Persetujuan',
  approved:  'Disetujui',
  paid:      'Lunas',
  completed: 'Selesai',
  rejected:  'Ditolak',
  cancelled: 'Dibatalkan',
}

const CATEGORY_LABELS: Record<string, string> = {
  mahasiswa_s1:    'Mahasiswa S1',
  mahasiswa_s2:    'Mahasiswa S2/S3',
  pascasarjana:    'Mahasiswa S2/S3',
  dosen_karyawan:  'Dosen/Karyawan',
  dosen:           'Dosen/Karyawan',
  kerjasama:       'Kerjasama/MoU',
  mou_unesa:       'Kerjasama/MoU',
  umum:            'Umum',
  borrower:        'Umum',
}

function fmtDate(dt: string): string {
  return new Date(dt).toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

function fmtRupiah(amount: number): string {
  if (!amount) return 'Gratis'
  return `Rp ${amount.toLocaleString('id-ID')}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildVars(booking: any): Record<string, string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = booking.booking_items ?? []

  const rooms = items.filter((i) => i.item_type === 'room')
  const equipments = items.filter((i) => i.item_type === 'equipment' || i.item_type === 'equipment')

  const roomNames = rooms.map((i) => i.rooms?.name ?? i.room?.name ?? 'Ruangan').filter(Boolean)
  const equipNames = equipments.map((i) => i.equipment?.name ?? 'Alat').filter(Boolean)
  const allNames = [...roomNames, ...equipNames]

  const daftarRuangan = roomNames.length
    ? roomNames.map((n, idx) => `${idx + 1}. ${n}`).join('\n')
    : ''
  const daftarAlat = equipNames.length
    ? equipNames.map((n, idx) => `${idx + 1}. ${n}`).join('\n')
    : ''

  const hasRoom = roomNames.length > 0
  const hasEquip = equipNames.length > 0
  const tipe = hasRoom && hasEquip ? 'Campuran (Ruangan + Alat)'
    : hasRoom ? 'Ruangan'
    : hasEquip ? 'Alat'
    : '-'

  const category = booking.users?.borrower_category
    ?? booking.borrower_category
    ?? booking.users?.role
    ?? 'borrower'

  const adminNotes: string = booking.admin_notes ?? booking.notes ?? ''
  const notesLine = adminNotes ? `📝 Catatan: ${adminNotes}` : ''

  return {
    '{{nama}}':             booking.users?.name ?? '-',
    '{{no_booking}}':       booking.reference_no ?? '-',
    '{{ruangan}}':          allNames.join(', ') || '-',
    '{{daftar_ruangan}}':   daftarRuangan,
    '{{daftar_alat}}':      daftarAlat,
    '{{jumlah_ruangan}}':   String(roomNames.length),
    '{{jumlah_alat}}':      String(equipNames.length),
    '{{tanggal_mulai}}':    booking.start_datetime ? fmtDate(booking.start_datetime) : '-',
    '{{tanggal_selesai}}':  booking.end_datetime   ? fmtDate(booking.end_datetime)   : '-',
    '{{status}}':           STATUS_LABELS[booking.status] ?? booking.status ?? '-',
    '{{catatan_admin}}':    notesLine,
    '{{kategori_pengguna}}': CATEGORY_LABELS[category] ?? 'Umum',
    '{{total_biaya}}':      fmtRupiah(booking.total_amount ?? 0),
    '{{tipe_peminjaman}}':  tipe,
  }
}

export function applyVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (text, [key, val]) => text.replaceAll(key, val ?? ''),
    template,
  )
}

// Map borrower_category → template user_category key used in notification_templates
export function categoryKey(borrowerCategory: string | null | undefined): string {
  const map: Record<string, string> = {
    mahasiswa_s1:   'mahasiswa_s1',
    mahasiswa_s2:   'mahasiswa_s2',
    pascasarjana:   'mahasiswa_s2',
    dosen_karyawan: 'dosen_karyawan',
    dosen:          'dosen_karyawan',
    kerjasama:      'kerjasama',
    mou_unesa:      'kerjasama',
    umum:           'umum',
    borrower:       'umum',
  }
  return map[borrowerCategory ?? ''] ?? 'default'
}
