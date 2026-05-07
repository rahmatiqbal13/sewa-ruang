import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import {
  Building2, CalendarDays, CreditCard, QrCode,
  Shield, Users, ArrowRight, CheckCircle2, ChevronRight,
  Sparkles, BarChart3, Clock, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  { 
    icon: Building2, 
    title: 'Katalog Terstruktur', 
    desc: 'Ruang & alat dikelompokkan per gedung, lengkap dengan data ketersediaan real-time.', 
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50' 
  },
  { 
    icon: CalendarDays, 
    title: 'Pengajuan Online', 
    desc: 'Ajukan peminjaman, pantau status, dan terima notifikasi tanpa perlu menghubungi admin.', 
    gradient: 'from-indigo-500 to-purple-500',
    bgColor: 'bg-indigo-50' 
  },
  { 
    icon: CreditCard, 
    title: 'Pencatatan Pembayaran', 
    desc: 'Catat pembayaran tunai, transfer, maupun online gateway — semua terdokumentasi otomatis.', 
    gradient: 'from-violet-500 to-pink-500',
    bgColor: 'bg-violet-50' 
  },
  { 
    icon: QrCode, 
    title: 'QR Code per Aset', 
    desc: 'Tempel QR Code di pintu ruangan atau pada alat untuk akses cepat data & inventaris.', 
    gradient: 'from-cyan-500 to-teal-500',
    bgColor: 'bg-cyan-50' 
  },
  { 
    icon: Shield, 
    title: 'Perjanjian Digital', 
    desc: 'Peminjam menyetujui perjanjian tanggung jawab secara digital sebelum booking diproses.', 
    gradient: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50' 
  },
  { 
    icon: Users, 
    title: 'Multi-Role', 
    desc: 'Admin, Staff, dan Peminjam masing-masing memiliki akses dan fitur yang sesuai tugasnya.', 
    gradient: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50' 
  },
]

const steps = [
  { n: '01', title: 'Buat Akun', desc: 'Daftar dengan email institusi dan isi data profil lengkap.' },
  { n: '02', title: 'Pilih Aset', desc: 'Cari ruangan atau alat dari katalog, cek ketersediaan, lalu ajukan peminjaman.' },
  { n: '03', title: 'Tunggu Persetujuan', desc: 'Admin memverifikasi pengajuan dan menginformasikan status via notifikasi.' },
  { n: '04', title: 'Gunakan & Kembalikan', desc: 'Gunakan sesuai jadwal, lalu catat pengembalian di sistem.' },
]

const stats = [
  { value: '10+', label: 'Gedung', icon: Building2 },
  { value: '50+', label: 'Ruangan', icon: CalendarDays },
  { value: '200+', label: 'Peralatan', icon: Zap },
  { value: '3', label: 'Peran Pengguna', icon: Users },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-40" />
              <div className="relative h-9 w-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-4 w-4 text-white" />
              </div>
            </div>
            <span className="font-bold text-xl text-slate-900">RentSpace</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/catalog" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-slate-600 hover:text-slate-900')}>
              Katalog
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-slate-600 hover:text-slate-900 hidden sm:inline-flex')}>
              Masuk
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: 'sm' }), 'btn-gradient text-white border-0')}>
              Daftar <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-violet-400/10 to-pink-400/10 rounded-full blur-3xl" />
          </div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 border border-indigo-100 shadow-sm shadow-indigo-500/10 text-indigo-600 text-sm px-4 py-2 rounded-full mb-8 fade-in">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Sistem Manajemen Aset Terintegrasi</span>
            </div>
            
            {/* Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1] slide-up">
              <span className="text-slate-900">Sewa Ruang &</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
                Peralatan Digital
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed slide-up" style={{ animationDelay: '0.1s' }}>
              Ganti catatan manual dan grup WhatsApp dengan sistem digital terpusat.
              Kelola aset, proses peminjaman, dan pantau penggunaan dalam satu platform modern.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center slide-up" style={{ animationDelay: '0.2s' }}>
              <Link href="/catalog" className={cn(
                buttonVariants({ size: 'lg' }), 
                'btn-gradient text-white border-0 text-base px-8 h-14'
              )}>
                Lihat Katalog <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/register" className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }), 
                'border-slate-200 text-slate-700 hover:bg-slate-50 text-base px-8 h-14'
              )}>
                Daftar Gratis
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-8 mt-12 slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">Gratis Pendaftaran</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">Proses Cepat</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">Aman & Terpercaya</span>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
            <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center pt-2">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative py-16 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={stat.label} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 mb-4 group-hover:scale-110 transition-transform">
                    <stat.icon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <p className="text-4xl font-bold text-slate-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-slate-50/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block text-indigo-600 text-sm font-semibold uppercase tracking-wider mb-4">
                Fitur Unggulan
              </span>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Semua yang Anda Butuhkan
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Platform lengkap untuk mengelola aset fisik institusi dari satu tempat dengan mudah dan efisien.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div 
                  key={f.title} 
                  className={cn(
                    'group relative bg-white rounded-2xl p-6 border border-slate-100 card-hover overflow-hidden',
                  )}
                >
                  {/* Gradient Border Effect */}
                  <div className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl',
                    f.gradient
                  )} style={{ padding: '1px' }}>
                    <div className="w-full h-full bg-white rounded-2xl" />
                  </div>
                  
                  <div className="relative">
                    <div className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br',
                      f.gradient
                    )}>
                      <f.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{f.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block text-indigo-600 text-sm font-semibold uppercase tracking-wider mb-4">
                Cara Kerja
              </span>
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Proses Sederhana & Transparan
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Hanya empat langkah mudah untuk memulai peminjaman ruang atau peralatan.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, i) => (
                <div key={step.n} className="relative">
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-0.5">
                      <div className="w-full h-full bg-gradient-to-r from-indigo-200 to-transparent" />
                    </div>
                  )}
                  <div className="relative text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg mb-6 shadow-lg shadow-indigo-500/25">
                      {step.n}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{step.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          </div>
          
          {/* Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
          
          <div className="relative max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Mulai Sekarang - Gratis!</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Siap Mengelola Aset<br />Dengan Lebih Baik?
            </h2>
            
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Daftar akun gratis dan ajukan peminjaman pertama Anda hari ini. 
              Tidak ada biaya tersembunyi.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className={cn(
                buttonVariants({ size: 'lg' }), 
                'bg-white text-indigo-600 hover:bg-slate-100 font-semibold text-base px-8 h-14 shadow-xl shadow-black/10'
              )}>
                Buat Akun Sekarang <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link href="/login" className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }), 
                'border-white/30 text-white hover:bg-white/10 text-base px-8 h-14'
              )}>
                Sudah Punya Akun
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-white">RentSpace</span>
                <p className="text-sm text-slate-400">Sistem Manajemen Peminjaman</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <Link href="/catalog" className="hover:text-white transition-colors">Katalog</Link>
              <Link href="/login" className="hover:text-white transition-colors">Masuk</Link>
              <Link href="/register" className="hover:text-white transition-colors">Daftar</Link>
            </div>
            
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} RentSpace. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
