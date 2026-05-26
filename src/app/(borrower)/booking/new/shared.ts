// Shared utilities for booking pages (safe to import in Client Components)

export type UserBorrowerCategory = 'mahasiswa' | 'pascasarjana' | 'dosen_karyawan' | 'kerjasama' | 'umum'
export type RateCategory = 'mahasiswa_s1' | 'mahasiswa_s2' | 'dosen' | 'mou_unesa' | 'umum'

export function mapUserToRateCategory(userCategory: UserBorrowerCategory | null): RateCategory {
  const map: Record<UserBorrowerCategory, RateCategory> = {
    'mahasiswa': 'mahasiswa_s1',
    'pascasarjana': 'mahasiswa_s2',
    'dosen_karyawan': 'dosen',
    'kerjasama': 'mou_unesa',
    'umum': 'umum',
  }
  return map[userCategory ?? 'mahasiswa'] ?? 'mahasiswa_s1'
}
