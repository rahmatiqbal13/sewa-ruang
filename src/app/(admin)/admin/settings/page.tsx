import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, BellRing, CreditCard, Shield, Building2 } from 'lucide-react'
import { InstitutionProfileForm } from './InstitutionProfileForm'
import { getInstitutionProfile } from './institutionActions'

const otherSections = [
  {
    icon: BellRing,
    title: 'Notifikasi',
    description: 'Konfigurasi channel notifikasi (Email, WhatsApp, Telegram) dan template pesan otomatis.',
    status: 'Aktif',
    href: '/admin/notifications',
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

export default async function SettingsPage() {
  const institutionProfile = await getInstitutionProfile()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi sistem Sewa Ruang & Alat</p>
      </div>

      {/* Institution Profile Section */}
      <InstitutionProfileForm initialData={institutionProfile} />

      {/* Other Settings Sections */}
      <div className="space-y-4 pt-6 border-t">
        <h2 className="text-lg font-semibold">Pengaturan Lainnya</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {otherSections.map((s) => (
            <Card 
              key={s.title} 
              className={s.href ? "cursor-pointer hover:shadow-md transition-shadow" : "opacity-70"}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <s.icon className="h-4 w-4" />
                  {s.title}
                  <span className={`ml-auto text-xs font-normal border rounded px-2 py-0.5 ${
                    s.status === 'Aktif' 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : 'text-muted-foreground'
                  }`}>
                    {s.status}
                  </span>
                </CardTitle>
                <CardDescription>{s.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>

      {/* System Info */}
      <Card className="border-border bg-muted">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
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
