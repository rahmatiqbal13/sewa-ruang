'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Building2, Loader2, Save, Globe, Phone, Mail, MapPin, Clock, ImageIcon, Building } from 'lucide-react'
import { toast } from 'sonner'
import { saveInstitutionProfile, InstitutionProfile } from './institutionActions'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

interface InstitutionProfileFormProps {
  initialData: InstitutionProfile | null
}

export function InstitutionProfileForm({ initialData }: InstitutionProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<InstitutionProfile>({
    name: initialData?.name || '',
    short_name: initialData?.short_name || '',
    logo_url: initialData?.logo_url || '',
    address: initialData?.address || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    website: initialData?.website || '',
    description: initialData?.description || '',
    operating_hours: initialData?.operating_hours || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await saveInstitutionProfile(formData)

    if (result.error) {
      toast.error('Gagal menyimpan: ' + result.error)
    } else {
      toast.success('Profil institusi berhasil disimpan!')
    }

    setIsLoading(false)
  }

  const hasData = formData.name || formData.short_name

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0891B2]/10">
              <Building2 className="h-5 w-5 text-[#0891B2]" />
            </div>
            Profil Institusi
          </h2>
          <p className="text-sm text-muted-foreground">
            Kelola nama, logo, dan informasi institusi yang ditampilkan di aplikasi
          </p>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-gradient-to-r from-[#0891B2] to-[#22D3EE] hover:opacity-90 text-white shadow-md shadow-[#0891B2]/20"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Simpan Perubahan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri - Logo & Preview */}
        <div className="space-y-6">
          <Card className="border-border rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#0891B2]/10">
                  <ImageIcon className="h-4 w-4 text-[#0891B2]" />
                </div>
                Logo Institusi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <PhotoUpload
                  value={formData.logo_url}
                  onChange={(url) => setFormData({ ...formData, logo_url: url ?? '' })}
                  folder="institution"
                  aspectRatio="square"
                />
                <p className="text-xs text-muted-foreground">
                  Logo akan ditampilkan di header aplikasi, dokumen resmi, dan landing page. 
                  Disarankan ukuran 1:1 (persegi) dengan format PNG atau JPG.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="border-border rounded-2xl overflow-hidden bg-gradient-to-br from-[#0891B2]/5 to-[#22D3EE]/5">
            <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[#0891B2] font-medium">Preview Tampilan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {formData.logo_url ? (
                  <img 
                    src={formData.logo_url} 
                    alt="Logo institusi" 
                    className="w-16 h-16 object-contain rounded-xl bg-white p-2 border border-[#0891B2]/10"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#0891B2]/10 flex items-center justify-center border border-[#0891B2]/20">
                    <Building className="h-8 w-8 text-[#0891B2]/60" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{formData.name || 'Nama Institusi'}</p>
                  <p className="text-xs text-[#0891B2]">{formData.short_name || 'Singkatan'}</p>
                </div>
              </div>
              
              {hasData && (
                <div className="pt-3 border-t border-[#0891B2]/10 space-y-1.5 text-sm">
                  {formData.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-[#0891B2]" />
                      {formData.phone}
                    </div>
                  )}
                  {formData.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-[#0891B2]" />
                      {formData.email}
                    </div>
                  )}
                  {formData.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 text-[#0891B2]" />
                      {formData.website}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan - Informasi */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#0891B2]/10">
                  <Building2 className="h-4 w-4 text-[#0891B2]" />
                </div>
                Informasi Dasar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nama Lengkap */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#0891B2] font-medium">
                  Nama Lengkap Institusi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Pusat Olahraga Universitas"
                  required
                  className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20"
                />
                <p className="text-xs text-muted-foreground">
                  Nama lengkap yang akan ditampilkan di header dan dokumen resmi
                </p>
              </div>

              {/* Nama Singkat */}
              <div className="space-y-2">
                <Label htmlFor="short_name" className="text-[#0891B2] font-medium">
                  Nama Singkat <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="short_name"
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  placeholder="Contoh: SC UNIV"
                  required
                  className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20"
                />
                <p className="text-xs text-muted-foreground">
                  Nama pendek untuk tampilan kompak dan notifikasi
                </p>
              </div>

              {/* Deskripsi */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-[#0891B2] font-medium">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat tentang institusi..."
                  rows={3}
                  className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20 resize-none"
                />
              </div>

              {/* Alamat */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2 text-[#0891B2] font-medium">
                  <MapPin className="h-4 w-4" />
                  Alamat Lengkap
                </Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Ketintang No. 1, Surabaya, Jawa Timur"
                  rows={2}
                  className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border rounded-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-400 to-[#22C55E]" />
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100">
                  <Phone className="h-4 w-4 text-emerald-600" />
                </div>
                Informasi Kontak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telepon */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-[#0891B2] font-medium">
                    <Phone className="h-4 w-4" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="031-1234567"
                    className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-[#0891B2] font-medium">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@institusi.ac.id"
                    className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2 text-[#0891B2] font-medium">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://institusi.ac.id"
                  className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20"
                />
              </div>

              {/* Jam Operasional */}
              <div className="space-y-2">
                <Label htmlFor="operating_hours" className="flex items-center gap-2 text-[#0891B2] font-medium">
                  <Clock className="h-4 w-4" />
                  Jam Operasional
                </Label>
                <Input
                  id="operating_hours"
                  value={formData.operating_hours || ''}
                  onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  placeholder="Senin-Jumat: 08.00-17.00, Sabtu: 08.00-12.00"
                  className="rounded-xl border-border focus:ring-2 focus:ring-[#0891B2]/20"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
