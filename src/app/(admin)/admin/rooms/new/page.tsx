import { createAdminDbClient } from '@/lib/supabase/server'
import { RoomForm } from '../RoomForm'
import Link from 'next/link'
import { ArrowLeft, DoorOpen } from 'lucide-react'

export default async function NewRoomPage() {
  const sb = createAdminDbClient()
  const { data: buildings } = await sb
    .from('buildings')
    .select('id, name, code, floor_count')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-3xl">
      {/* Back Button */}
      <Link 
        href="/admin/rooms"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar ruangan
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-primary rounded-[14px] flex items-center justify-center shadow-lg">
          <DoorOpen className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tambah Ruangan Baru</h1>
          <p className="text-muted-foreground">Isi detail ruangan untuk menambahkan ke sistem</p>
        </div>
      </div>

      <RoomForm buildings={buildings ?? []} />
    </div>
  )
}
