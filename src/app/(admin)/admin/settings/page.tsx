import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, BellRing, CreditCard, Shield, Building2, Info } from 'lucide-react'
import { InstitutionProfileForm } from './InstitutionProfileForm'
import { getInstitutionProfile } from './institutionActions'

const otherSections = [
  {
    icon: BellRing,
    title: 'Pesan Otomatis',
    description: 'Kelola template pesan otomatis dan konfigurasi channel pengiriman (Email, WhatsApp, Telegram).',
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
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
        <p className="text-muted-foreground text-sm">Konfigurasi sistem Sewa Ruang & Alat</p>
      </div>

      {/* Institution Profile Section - Prominent */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] shadow-md shadow-[#0891B2]/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Profil Institusi</h2>
            <p className="text-sm text-muted-foreground">Nama, logo, dan informasi institusi</p>
          </div>
        </div>
        <InstitutionProfileForm initialData={institutionProfile} />
      </div>

      {/* Other Settings Sections */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-400 to-purple-400 shadow-md shadow-violet-400/20">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Pengaturan Lainnya</h2>
            <p className="text-sm text-muted-foreground">Konfigurasi tambahan sistem</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {otherSections.map((s) => (
            <Card 
              key={s.title} 
              className={cn(
                "rounded-2xl overflow-hidden border-border transition-all duration-200",
                s.href ? "cursor-pointer hover:shadow-lg hover:border-[#0891B2]/30" : "opacity-70"
              )}
            >
              <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <s.icon className="h-4 w-4 text-[#0891B2]" />
                  {s.title}
                  <span className={`ml-auto text-xs font-normal border rounded-full px-2.5 py-0.5 ${
                    s.status === 'Aktif' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {s.status}
                  </span>
                </CardTitle>
                <CardDescription className="text-sm leading-relaxed">{s.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </div>
      </div>

      {/* System Info */}
      <Card className="border-border rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
        <div className="h-1 bg-gradient-to-r from-slate-400 to-slate-500" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Info className="h-4 w-4 text-slate-500" /> Informasi Sistem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Versi Aplikasi: <span className="font-medium text-foreground">1.0.0</span></p>
          <p>Framework: <span className="font-medium text-foreground">Next.js 16 + Supabase</span></p>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper cn function (avoiding import from lib/utils since it's a server component)
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
