import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { CreditFooter } from '@/components/shared/CreditFooter'
import {
  Building2,
  CalendarDays,
  Shield,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Building,
  Wrench,
  FileCheck,
  GraduationCap,
  UserCircle,
  Briefcase,
  Handshake,
  Globe,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Navbar } from './(components)/Navbar'
import { KatalogPreview } from './(components)/KatalogPreview'

// Server-side fetch data
async function getLandingData() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const [
      { data: institution, error: instError },
      { count: roomCount },
      { count: equipmentCount },
      { count: bookingCount },
      { data: previewRooms, error: roomsError },
      { data: previewEquipment, error: equipmentError },
    ] = await Promise.all([
      supabase.from('institution_profile').select('*').single(),
      supabase.from('rooms').select('*', { count: 'exact', head: true }),
      supabase.from('equipment').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase
        .from('rooms')
        .select('id, name, room_code, capacity, photo_url, rate_per_day')
        .eq('is_active', true)
        .eq('is_for_rent', true)
        .order('name')
        .limit(3),
      supabase
        .from('equipment')
        .select('id, name, category, photo_url, rate_per_day')
        .eq('is_active', true)
        .eq('current_condition', 'good')
        .order('name')
        .limit(3),
    ])

    if (instError) {
      console.error('Error fetching institution:', JSON.stringify(instError))
    }
    if (roomsError) {
      console.error('Error fetching preview rooms:', JSON.stringify(roomsError, null, 2))
    }
    if (equipmentError) {
      console.error('Error fetching preview equipment:', JSON.stringify(equipmentError, null, 2))
    }

    return {
      institution: institution || null,
      roomCount: roomCount || 0,
      equipmentCount: equipmentCount || 0,
      bookingCount: bookingCount || 0,
      previewRooms: previewRooms ?? [],
      previewEquipment: previewEquipment ?? [],
    }
  } catch (error) {
    console.error('Error fetching landing data:', error)
    return null
  }
}

// Stats config (values passed dynamically from DB)
const statsConfig = [
  { key: 'rooms' as const, label: 'Ruangan', icon: Building, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { key: 'equipment' as const, label: 'Peralatan', icon: Wrench, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { key: 'bookings' as const, label: 'Peminjaman', icon: FileCheck, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { key: 'satisfaction' as const, label: 'Kepuasan', icon: CheckCircle2, color: 'text-orange-600', bgColor: 'bg-orange-50' },
]

// Steps data
const steps = [
  {
    n: 1,
    title: 'Pilih Aset',
    desc: 'Telusuri katalog ruangan dan peralatan yang tersedia',
    color: 'bg-blue-900',
    borderColor: 'border-blue-900',
  },
  {
    n: 2,
    title: 'Ajukan Peminjaman',
    desc: 'Isi formulir peminjaman dengan detail kebutuhan Anda',
    color: 'bg-indigo-600',
    borderColor: 'border-indigo-600',
  },
  {
    n: 3,
    title: 'Ambil & Gunakan',
    desc: 'Setelah disetujui, ambil aset dan gunakan sesuai jadwal',
    color: 'bg-emerald-600',
    borderColor: 'border-emerald-600',
  },
]

// Borrower categories
const borrowerCategories = [
  {
    label: 'Mahasiswa S1',
    desc: 'Mahasiswa program sarjana',
    icon: GraduationCap,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Mahasiswa S2',
    desc: 'Mahasiswa program magister',
    icon: GraduationCap,
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    label: 'Dosen',
    desc: 'Tenaga pengajar',
    icon: UserCircle,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    label: 'Staff',
    desc: 'Tenaga kependidikan',
    icon: Briefcase,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    label: 'Mitra MOU',
    desc: 'Kerjasama institusi',
    icon: Handshake,
    color: 'bg-amber-50 text-amber-600',
  },
  {
    label: 'Umum',
    desc: 'Masyarakat umum',
    icon: Globe,
    color: 'bg-rose-50 text-rose-600',
  },
]

export default async function HomePage() {
  const data = await getLandingData()
  const institution = data?.institution || null
  const roomCount = data?.roomCount || 0
  const equipmentCount = data?.equipmentCount || 0
  const bookingCount = data?.bookingCount || 0
  const previewRooms = data?.previewRooms ?? []
  const previewEquipment = data?.previewEquipment ?? []
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-white">
      {/* 1. NAVBAR */}
      <Navbar />

      <main className="pt-16">
        {/* 2. HERO */}
        <section className="relative bg-gradient-to-br from-[#0891B2] to-[#06b6d4]">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left Content */}
              <div className="text-center lg:text-left">
                {/* Eyebrow */}
                {institution?.short_name && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-white/70 text-sm font-medium mb-5">
                    <Building2 className="h-4 w-4" />
                    {institution.short_name}
                  </div>
                )}

                {/* H1 */}
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white leading-[1.15] mb-4">
                  Sewa Ruang & Alat
                </h1>

                {/* Subtext */}
                <p className="text-base lg:text-lg text-white/80 mb-6 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                  {institution?.description ||
                    'Platform digital terintegrasi untuk peminjaman ruangan dan peralatan di lingkungan kampus. Proses mudah, transparan, dan terpercaya.'}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                  <Link
                    href="/catalog"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#0891B2] font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg shadow-black/10"
                  >
                    Jelajahi Katalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20 transition-all"
                  >
                    Ajukan Peminjaman
                  </Link>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
                  {[
                    { icon: CheckCircle2, label: 'Proses Cepat' },
                    { icon: Shield, label: 'Transparan' },
                    { icon: CheckCircle2, label: 'Aman Terpercaya' },
                  ].map((badge, index) => (
                    <div key={`${badge.label}-${index}`} className="flex items-center gap-1.5 text-white/80">
                      <badge.icon className="h-4 w-4 text-emerald-300" />
                      <span className="text-sm font-medium">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Illustration - only on large screens */}
              <div className="hidden lg:flex justify-center items-center">
                <div className="relative w-72 h-64">
                  {/* Main Card */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-44 bg-white/10 backdrop-blur-md rounded-[20px] border border-white/20 p-5 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">Ruang Seminar</p>
                        <p className="text-white/60 text-xs">A101 - Gedung A</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 bg-white/20 rounded-full w-full" />
                      <div className="h-2 bg-white/20 rounded-full w-3/4" />
                      <div className="h-2 bg-white/10 rounded-full w-1/2" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-white/60 text-xs">Kapasitas: 50</span>
                      <span className="bg-emerald-500/30 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full">Tersedia</span>
                    </div>
                  </div>

                {/* Floating Small Card - Top Right */}
                <div className="absolute top-4 right-0 w-36 h-20 bg-white/10 backdrop-blur-sm rounded-[16px] border border-white/20 p-3 shadow-xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                      <CalendarDays className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-white text-xs font-medium">Jadwal</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-white/20 rounded-full w-full" />
                    <div className="h-1.5 bg-white/10 rounded-full w-2/3" />
                  </div>
                </div>

                {/* Floating Check */}
                <div className="absolute bottom-8 left-4 w-10 h-10 bg-emerald-500/30 backdrop-blur-sm rounded-lg flex items-center justify-center border border-emerald-400/30">
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. STATS ROW */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {statsConfig.map((stat) => {
                const rawValue = stat.key === 'rooms' ? roomCount 
                  : stat.key === 'equipment' ? equipmentCount 
                  : stat.key === 'bookings' ? bookingCount 
                  : 0
                const value = rawValue
                const displayValue = stat.key === 'satisfaction' ? `${value}%` : `${value}+`
                return (
                  <div key={stat.label} className="text-center">
                    <div className={`inline-flex items-center justify-center w-14 h-14 ${stat.bgColor} rounded-2xl mb-4`}>
                      <stat.icon className={`h-7 w-7 ${stat.color}`} />
                    </div>
                    <p className="text-3xl lg:text-4xl font-bold text-[#111827] mb-1">{displayValue}</p>
                    <p className="text-sm text-[#6B7280] font-medium">{stat.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* 4. CARA MEMINJAM - FIXED: Always visible steps */}
        <section id="cara" className="py-20 bg-[#F9FAFB]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Title */}
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#111827] mb-4">
                Cara Meminjam
              </h2>
              <p className="text-[#6B7280] max-w-2xl mx-auto text-base">
                Proses peminjaman yang mudah dan transparan dalam tiga langkah sederhana
              </p>
            </div>

            {/* Steps - Desktop (md and up) */}
            <div className="hidden md:block relative">
              {/* Connector Line */}
              <div className="absolute top-[2rem] left-[16.66%] right-[16.66%] h-0.5 bg-gray-200">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-900 rounded-full" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-600 rounded-full" />
              </div>

              <div className="grid grid-cols-3 gap-8">
                {steps.map((step) => (
                  <div key={step.n} className="relative text-center">
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 ${step.color} text-white text-xl font-bold rounded-2xl mb-6 shadow-lg mx-auto`}
                    >
                      {step.n}
                    </div>
                    <h3 className="text-xl font-semibold text-[#111827] mb-3">{step.title}</h3>
                    <p className="text-[#6B7280] leading-relaxed px-4 text-sm">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps - Mobile (below md) */}
            <div className="md:hidden relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
              {steps.map((step) => (
                <div key={step.n} className="relative flex gap-6 mb-10 last:mb-0">
                  <div
                    className={`relative z-10 flex-shrink-0 w-16 h-16 ${step.color} text-white text-xl font-bold rounded-2xl flex items-center justify-center shadow-lg`}
                  >
                    {step.n}
                  </div>
                  <div className="pt-3">
                    <h3 className="text-lg font-semibold text-[#111827] mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. KATALOG PREVIEW */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Title */}
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#111827] mb-4">
                Katalog Terbaru
              </h2>
              <p className="text-[#6B7280] max-w-2xl mx-auto text-base">
                Pilih dari berbagai ruangan dan peralatan yang tersedia untuk kebutuhan Anda
              </p>
            </div>

            {/* Katalog Preview Component */}
            <KatalogPreview rooms={previewRooms} equipment={previewEquipment} />

          </div>
        </section>

        {/* 6. KATEGORI PEMINJAM */}
        <section className="py-20 bg-[#ecfeff]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {/* Title */}
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-[#111827] mb-4">
                Kategori Peminjam
              </h2>
              <p className="text-[#6B7280] max-w-2xl mx-auto text-base">
                Sistem melayani berbagai kategori peminjam dengan kebutuhan yang berbeda
              </p>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {borrowerCategories.map((category) => (
                <div
                  key={category.label}
                  className="bg-white rounded-[14px] p-6 border border-[#E5E7EB] hover:shadow-lg transition-all duration-300 group cursor-default"
                >
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 ${category.color} rounded-2xl mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <category.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#111827] mb-2">{category.label}</h3>
                  <p className="text-[#6B7280] text-sm">{category.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CTA BANNER */}
        <section className="py-8 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="relative rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#06b6d4] overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                    backgroundSize: '32px 32px',
                  }}
                />
              </div>

              <div className="relative py-14 px-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  Siap Memulai Peminjaman?
                </h2>
                <p className="text-white/80 mb-8 max-w-xl mx-auto text-base">
                  Daftar sekarang dan nikmati kemudahan meminjam ruangan dan peralatan dengan proses yang cepat dan transparan
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-[#0891B2] font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
                >
                  Mulai Sekarang
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 8. FOOTER */}
      <footer id="kontak" className="bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Tentang USC */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-[#0891B2] rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-lg text-white">{institution?.short_name || 'USC'}</span>
                </div>
              </div>
              {institution?.description && (
                <p className="text-sm leading-relaxed text-gray-400 mb-4">
                  {institution.description}
                </p>
              )}
            </div>

            {/* Link Cepat */}
            <div>
              <h4 className="font-semibold text-white mb-5">Link Cepat</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/catalog" className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                    <Search className="h-3.5 w-3.5" />
                    Katalog
                  </Link>
                </li>
                <li>
                  <Link href="#cara" className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                    <FileCheck className="h-3.5 w-3.5" />
                    Cara Peminjaman
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Masuk
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-gray-400 hover:text-white transition-colors inline-flex items-center gap-2">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Daftar
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <h4 className="font-semibold text-white mb-5">Kontak</h4>
              <div className="space-y-3 text-sm">
                {institution?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
                    <span className="text-gray-400">{institution.address}</span>
                  </div>
                )}
                {institution?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500 shrink-0" />
                    <a href={`tel:${institution.phone}`} className="text-gray-400 hover:text-white transition-colors">
                      {institution.phone}
                    </a>
                  </div>
                )}
                {institution?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500 shrink-0" />
                    <a href={`mailto:${institution.email}`} className="text-gray-400 hover:text-white transition-colors">
                      {institution.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Copyright Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              &copy; {currentYear} {institution?.name || 'Sewa Ruang & Alat'}. All rights reserved.
            </p>
            {institution?.website && (
              <a
                href={institution.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                {institution.website}
              </a>
            )}
          </div>
          <CreditFooter />
        </div>
      </footer>
    </div>
  )
}
