import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import {
  Building2, CalendarDays, CreditCard, QrCode,
  Shield, Users, ArrowRight, CheckCircle2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  { icon: Building2, title: 'Katalog Terstruktur', desc: 'Ruang & alat dikelompokkan per gedung, lengkap dengan data ketersediaan real-time.', color: 'bg-blue-100 text-blue-700' },
  { icon: CalendarDays, title: 'Pengajuan Online', desc: 'Ajukan peminjaman, pantau status, dan terima notifikasi tanpa perlu menghubungi admin.', color: 'bg-indigo-100 text-indigo-700' },
  { icon: CreditCard, title: 'Pencatatan Pembayaran', desc: 'Catat pembayaran tunai, transfer, maupun online gateway — semua terdokumentasi otomatis.', color: 'bg-violet-100 text-violet-700' },
  { icon: QrCode, title: 'QR Code per Aset', desc: 'Tempel QR Code di pintu ruangan atau pada alat untuk akses cepat data & inventaris.', color: 'bg-cyan-100 text-cyan-700' },
  { icon: Shield, title: 'Perjanjian Digital', desc: 'Peminjam menyetujui perjanjian tanggung jawab secara digital sebelum booking diproses.', color: 'bg-green-100 text-green-700' },
  { icon: Users, title: 'Multi-Role', desc: 'Admin, Staff, dan Peminjam masing-masing memiliki akses dan fitur yang sesuai tugasnya.', color: 'bg-amber-100 text-amber-700' },
]

const steps = [
  { n: '01', title: 'Buat Akun', desc: 'Daftar dengan email institusi dan isi data profil lengkap.' },
  { n: '02', title: 'Pilih Aset', desc: 'Cari ruangan atau alat dari katalog, cek ketersediaan, lalu ajukan peminjaman.' },
  { n: '03', title: 'Tunggu Persetujuan', desc: 'Admin memverifikasi pengajuan dan menginformasikan status via notifikasi.' },
  { n: '04', title: 'Gunakan & Kembalikan', desc: 'Gunakan sesuai jadwal, lalu catat pengembalian di sistem.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="border-b bg-white/95 sticky top-0 z-50 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary">
            <div className="bg-blue-950 text-white p-1.5 rounded-lg">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="text-blue-950">Sewa Ruang & Alat</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/catalog" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Katalog</Link>
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden sm:inline-flex')}>Masuk</Link>
            <Link href="/register" className={buttonVariants({ size: 'sm' })}>
              Daftar <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-800/60 border border-blue-700 text-blue-200 text-sm px-4 py-1.5 rounded-full mb-6">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              Sistem Manajemen Aset Terpusat
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
              Sewa Ruang & Peralatan<br className="hidden sm:block" />
              <span className="text-blue-300"> Lebih Mudah</span>
            </h1>
            <p className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto mb-10">
              Ganti catatan manual dan grup WhatsApp dengan sistem digital terpusat.
              Ajukan, setujui, bayar, dan lacak peminjaman dalam satu platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/catalog" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-blue-950 hover:bg-blue-50 font-semibold')}>
                Lihat Katalog <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/register" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-white/40 text-white hover:bg-white/10')}>
                Daftar Gratis
              </Link>
            </div>
          </div>
          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-12 md:h-16">
              <path d="M0 60L1440 60L1440 20C1200 55 900 0 720 20C540 40 240 10 0 30L0 60Z" fill="white" />
            </svg>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '10+', label: 'Gedung' },
                { value: '50+', label: 'Ruangan' },
                { value: '200+', label: 'Peralatan' },
                { value: '3', label: 'Peran Pengguna' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-3xl font-bold text-blue-950">{s.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-zinc-50 py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Semua yang Anda Butuhkan</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Platform lengkap untuk mengelola aset fisik institusi dari satu tempat.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => (
                <div key={f.title} className="bg-white rounded-2xl p-6 border hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', f.color)}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Cara Kerja</h2>
              <p className="text-muted-foreground">Proses peminjaman yang sederhana dan transparan</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s, i) => (
                <div key={s.n} className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-blue-200 to-transparent z-0" />
                  )}
                  <div className="relative z-10 text-center">
                    <div className="w-12 h-12 bg-blue-950 text-white rounded-full flex items-center justify-center font-bold text-sm mx-auto mb-4">
                      {s.n}
                    </div>
                    <h3 className="font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-blue-950 to-indigo-900 text-white py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Mulai Kelola Aset Sekarang</h2>
            <p className="text-blue-200 mb-8">Daftar akun gratis dan ajukan peminjaman pertama Anda hari ini.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className={cn(buttonVariants({ size: 'lg' }), 'bg-white text-blue-950 hover:bg-blue-50 font-semibold')}>
                Buat Akun Peminjam <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-white/40 text-white hover:bg-white/10')}>
                Sudah Punya Akun
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-zinc-50 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-950">
            <Building2 className="h-4 w-4" />
            Sewa Ruang & Alat
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Sistem Sewa Ruang & Alat
          </p>
        </div>
      </footer>
    </div>
  )
}
