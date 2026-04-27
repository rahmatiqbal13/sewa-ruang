import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, CalendarDays, CreditCard, QrCode, Shield, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  { icon: Building2, title: 'Katalog Terstruktur', desc: 'Ruang & alat dikelompokkan per gedung, lengkap dengan kalender ketersediaan real-time.' },
  { icon: CalendarDays, title: 'Pengajuan Online', desc: 'Ajukan peminjaman, pantau status, dan terima notifikasi tanpa perlu menghubungi admin.' },
  { icon: CreditCard, title: 'Pencatatan Pembayaran', desc: 'Catat pembayaran tunai, transfer, maupun online gateway — semua terdokumentasi.' },
  { icon: QrCode, title: 'QR Code per Aset', desc: 'Tempel QR Code di pintu ruangan atau pada alat untuk akses cepat data & inventaris.' },
  { icon: Shield, title: 'Perjanjian Digital', desc: 'Peminjam menyetujui perjanjian tanggung jawab secara digital sebelum booking diproses.' },
  { icon: Users, title: 'Multi-Role', desc: 'Admin, Staff, dan Peminjam masing-masing memiliki akses yang sesuai tugasnya.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white/95 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-primary">
            <Building2 className="h-5 w-5" />
            Sewa Ruang & Alat
          </div>
          <div className="flex items-center gap-2">
            <Link href="/catalog" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Katalog</Link>
            <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Masuk</Link>
            <Link href="/register" className={buttonVariants({ size: 'sm' })}>Daftar</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Sistem Sewa Ruang &<br className="hidden sm:block" /> Peralatan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Ganti catatan manual dan grup WhatsApp dengan sistem pencatatan terpusat.
            Ajukan, setujui, bayar, dan lacak peminjaman dalam satu platform.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/catalog" className={buttonVariants({ size: 'lg' })}>Lihat Katalog</Link>
            <Link href="/register" className={buttonVariants({ size: 'lg', variant: 'outline' })}>Daftar Gratis</Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-zinc-50 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-10">Semua yang Anda Butuhkan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <Card key={f.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <f.icon className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Mulai Sekarang</h2>
          <p className="text-muted-foreground mb-6">Daftar akun dan ajukan peminjaman pertama Anda hari ini.</p>
          <Link href="/register" className={buttonVariants({ size: 'lg' })}>Buat Akun Peminjam</Link>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Sistem Sewa Ruang & Alat &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
