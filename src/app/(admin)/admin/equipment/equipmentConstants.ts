export const CATEGORY_LABELS: Record<string, string> = {
  elektronik: 'Elektronik',
  mebel: 'Mebel',
  transportasi: 'Transportasi',
  alat_tes_pengukuran: 'Alat Tes Pengukuran',
  alat_gym: 'Alat Gym/Fitness',
  perlengkapan: 'Perlengkapan',
  lainnya: 'Lainnya',
}

export const KETERSEDIAAN: Record<string, { label: string; badgeClass: string }> = {
  tersedia:        { label: 'Tersedia',       badgeClass: 'bg-green-100 text-green-700 border-green-200' },
  digunakan:       { label: 'Digunakan',      badgeClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  hilang:          { label: 'Hilang',         badgeClass: 'bg-red-100 text-red-700 border-red-200' },
  tidak_tersedia:  { label: 'Tidak Tersedia', badgeClass: 'bg-gray-100 text-foreground/80 border-border' },
}

export const CONDITION_OPTIONS = [
  { value: '', label: 'Semua Kondisi' },
  { value: 'good', label: 'Baik' },
  { value: 'needs_repair', label: 'Perlu Perbaikan' },
  { value: 'damaged', label: 'Rusak' },
  { value: 'lost', label: 'Hilang' },
]
