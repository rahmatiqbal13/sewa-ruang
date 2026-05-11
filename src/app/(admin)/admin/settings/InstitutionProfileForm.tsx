'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2, Save, Globe, Phone, Mail, MapPin, Clock, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { saveInstitutionProfile, InstitutionProfile } from './institutionActions'
import { PhotoUpload } from '@/components/shared/PhotoUpload'

interface InstitutionProfileFormProps {
  initialData: InstitutionProfile | null
}

export function InstitutionProfileForm({ initialData }: InstitutionProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<InstitutionProfile>({
    name: initialData?.name || 'Sport Center UNESA',
    short_name: initialData?.short_name || 'SC UNESA',
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Profil Institusi
          </h2>
          <p className="text-sm text-slate-500">
            Kelola informasi kampus/institusi yang akan ditampilkan di aplikasi
          </p>
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700"
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
        {/* Kolom Kiri - Informasi Dasar */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Dasar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Nama Lengkap */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nama Lengkap Institusi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Sport Center Universitas Negeri Surabaya"
                  required
                />
                <p className="text-xs text-slate-500">
                  Nama lengkap yang akan ditampilkan di header dan dokumen resmi
                </p>
              </div>

              {/* Nama Singkat */}
              <div className="space-y-2">
                <Label htmlFor="short_name">
                  Nama Singkat <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="short_name"
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  placeholder="Contoh: SC UNESA"
                  required
                />
                <p className="text-xs text-slate-500">
                  Nama pendek untuk tampilan kompak dan notifikasi
                </p>
              </div>

              {/* Deskripsi */}
              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Deskripsi singkat tentang institusi..."
                  rows={3}
                />
              </div>

              {/* Alamat */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Alamat Lengkap
                </Label>
                <Textarea
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Jl. Ketintang No. 1, Surabaya, Jawa Timur"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Kontak */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Kontak</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Telepon */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Nomor Telepon
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="031-1234567"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sportcenter@unesa.ac.id"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://sportcenter.unesa.ac.id"
                />
              </div>

              {/* Jam Operasional */}
              <div className="space-y-2">
                <Label htmlFor="operating_hours" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Jam Operasional
                </Label>
                <Input
                  id="operating_hours"
                  value={formData.operating_hours || ''}
                  onChange={(e) => setFormData({ ...formData, operating_hours: e.target.value })}
                  placeholder="Senin-Jumat: 08.00-17.00, Sabtu: 08.00-12.00"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Kanan - Logo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
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
                <p className="text-xs text-slate-500">
                  Logo akan ditampilkan di header aplikasi dan dokumen resmi. 
                  Disarankan ukuran 1:1 (persegi) dengan format PNG atau JPG.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="bg-slate-50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-600">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.logo_url && (
                <img 
                  src={formData.logo_url} 
                  alt="Logo" 
                  className="w-16 h-16 object-contain mx-auto"
                />
              )}
              <div className="text-center">
                <p className="font-semibold text-sm">{formData.name}</p>
                <p className="text-xs text-slate-500">{formData.short_name}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
