import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, BellRing, CreditCard, Shield } from 'lucide-react'

const sections = [
  {
    icon: BellRing,
    title: 'Notifikasi',
    description: 'Konfigurasi channel notifikasi (Email, WhatsApp, Telegram) dan template pesan otomatis.',
    status: 'Segera Hadir',
  },
  {
    icon: CreditCard,
    title: 'Pembayaran',
    description: 'Konfigurasi payment gateway (Midtrans) dan metode pembayaran yang tersedia.',
    status: 'Segera Hadir',
  },
  {
    icon: Shield,
    title: 'Perjanjian',
    description: 'Kelola template surat perjanjian tanggung jawab peminjaman.',
    status: 'Segera Hadir',
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi sistem Sewa Ruang & Alat</p>
      </div>

      <div className="grid gap-4">
        {sections.map((s) => (
          <Card key={s.title} className="opacity-70">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <s.icon className="h-4 w-4" />
                {s.title}
                <span className="ml-auto text-xs font-normal text-muted-foreground border rounded px-2 py-0.5">
                  {s.status}
                </span>
              </CardTitle>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>

      <Card className="border-zinc-200 bg-zinc-50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" /> Informasi Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Versi Aplikasi: <span className="font-medium text-foreground">1.0.0</span></p>
          <p>Framework: <span className="font-medium text-foreground">Next.js 16.2.4 + Supabase</span></p>
        </CardContent>
      </Card>
    </div>
  )
}
