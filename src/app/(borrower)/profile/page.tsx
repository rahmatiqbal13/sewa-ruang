'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  GraduationCap, 
  CreditCard, 
  Send,
  Loader2,
  Save,
  ArrowLeft,
  Camera,
  Calendar,
  Package
} from 'lucide-react'
import { ImageUpload } from '@/components/shared/ImageUpload'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

import { BORROWER_CATEGORIES, getBorrowerCategoryLabel } from '@/lib/categories'

const schema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  phone: z.string().min(10, 'Nomor WhatsApp tidak valid'),
  institution: z.string().min(2, 'Instansi wajib diisi').max(100),
  class_division: z.string().min(1, 'Kelas/Divisi wajib diisi').max(50),
  identity_number: z.string().max(20).optional(),
  telegram_username: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  borrower_category: string
  institution: string
  class_division: string
  identity_number: string | null
  telegram_username: string | null
  photo_url: string | null
  created_at: string
  role: string
}

interface Booking {
  id: string
  reference_no: string
  status: string
  start_datetime: string
  end_datetime: string
  total_amount: number
  purpose: string
  created_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [photoUrl, setPhotoUrl] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch profile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      if (profileData) {
        setProfile(profileData)
        setPhotoUrl(profileData.photo_url || '')
        
        // Set form values
        setValue('name', profileData.name)
        setValue('phone', profileData.phone)
        setValue('institution', profileData.institution)
        setValue('class_division', profileData.class_division)
        setValue('identity_number', profileData.identity_number || '')
        setValue('telegram_username', profileData.telegram_username || '')
      }

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (bookingsData) {
        setBookings(bookingsData)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Gagal memuat profil')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(data: FormData) {
    if (!profile) return
    
    setSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('users')
        .update({
          name: data.name,
          phone: data.phone,
          institution: data.institution,
          class_division: data.class_division,
          identity_number: data.identity_number || null,
          telegram_username: data.telegram_username || null,
          photo_url: photoUrl || null,
        })
        .eq('id', profile.id)

      if (error) throw error

      toast.success('Profil berhasil diperbarui!')
      fetchProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Gagal memperbarui profil')
    } finally {
      setSaving(false)
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      active: 'bg-blue-100 text-blue-700',
      completed: 'bg-muted text-muted-foreground',
      cancelled: 'bg-red-100 text-red-700',
      rejected: 'bg-red-100 text-red-700',
    }
    return styles[status] || 'bg-muted text-muted-foreground'
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: 'Menunggu',
      approved: 'Disetujui',
      active: 'Aktif',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      rejected: 'Ditolak',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profil tidak ditemukan</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-foreground">Profil Saya</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card p-1 rounded-[14px] border border-border">
            <TabsTrigger value="profile" className="rounded-[10px] data-[state=active]:bg-blue-950 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="bookings" className="rounded-[10px] data-[state=active]:bg-blue-950 data-[state=active]:text-white">
              <Calendar className="h-4 w-4 mr-2" />
              Riwayat Peminjaman
              {bookings.length > 0 && (
                <span className="ml-2 bg-muted text-foreground/80 text-xs px-2 py-0.5 rounded-full">
                  {bookings.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Photo */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Foto Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Photo */}
                  <div className="flex flex-col items-center">
                    {photoUrl ? (
                      <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={photoUrl} 
                          alt={profile.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border/60">
                        <User className="h-16 w-16 text-muted-foreground/70" />
                      </div>
                    )}
                    <p className="mt-3 text-sm font-medium text-foreground">{profile.name}</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>

                  <div className="border-t border-border pt-4">
                    <ImageUpload 
                      value={photoUrl}
                      onChange={setPhotoUrl}
                      bucket="avatars"
                      folder="users"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right Column - Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informasi Pribadi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground/70" />
                          Nama Lengkap
                        </Label>
                        <Input {...register('name')} className="h-11" />
                        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground/70" />
                          Email
                        </Label>
                        <Input value={profile.email} disabled className="h-11 bg-muted" />
                        <p className="text-xs text-muted-foreground">Email tidak dapat diubah</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground/70" />
                          Nomor WhatsApp
                        </Label>
                        <Input {...register('phone')} className="h-11" />
                        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground/70" />
                          Kategori Peminjam
                        </Label>
                        <div className="h-11 px-3 flex items-center rounded-md border bg-muted text-sm text-foreground/80">
                          {getBorrowerCategoryLabel(profile.borrower_category)}
                        </div>
                        <p className="text-xs text-muted-foreground">Kategori tidak dapat diubah setelah pendaftaran</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground/70" />
                          Instansi / Organisasi
                        </Label>
                        <Input {...register('institution')} className="h-11" />
                        {errors.institution && <p className="text-xs text-destructive">{errors.institution.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground/70" />
                          Kelas / Divisi
                        </Label>
                        <Input {...register('class_division')} className="h-11" />
                        {errors.class_division && <p className="text-xs text-destructive">{errors.class_division.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground/70" />
                          NIM / NIP / KTP
                        </Label>
                        <Input {...register('identity_number')} className="h-11" placeholder="Opsional" />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-muted-foreground/70" />
                          Username Telegram
                        </Label>
                        <Input {...register('telegram_username')} className="h-11" placeholder="@username (Opsional)" />
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border">
                      <Button 
                        type="submit" 
                        className="h-11 px-6 bg-blue-950 hover:bg-blue-900"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Simpan Perubahan
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Member Info Card */}
            <Card className="bg-gradient-to-r from-blue-950 to-indigo-900 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-sm">Bergabung sejak</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(profile.created_at), 'dd MMMM yyyy', { locale: id })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-200 text-sm">Status Akun</p>
                    <p className="text-lg font-semibold capitalize">
                      {profile.role === 'borrower' ? 'Peminjam' : profile.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Riwayat Peminjaman
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-muted-foreground/70" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Belum ada peminjaman</h3>
                    <p className="text-muted-foreground mb-4">Anda belum memiliki riwayat peminjaman</p>
                    <Link href="/catalog">
                      <Button className="bg-blue-950 hover:bg-blue-900">
                        Jelajahi Katalog
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-[14px] hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {booking.reference_no}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(booking.status)}`}>
                              {getStatusLabel(booking.status)}
                            </span>
                          </div>
                          <p className="font-medium text-foreground">{booking.purpose}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(booking.start_datetime), 'dd MMM yyyy', { locale: id })} - {format(new Date(booking.end_datetime), 'dd MMM yyyy', { locale: id })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            Rp {booking.total_amount?.toLocaleString('id-ID')}
                          </p>
                          <Link href={`/bookings/${booking.id}`}>
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                              Detail
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
