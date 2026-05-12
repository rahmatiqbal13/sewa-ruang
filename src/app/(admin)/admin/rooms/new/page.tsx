import { createAdminClient as createClient } from '@/lib/supabase/server'
import { RoomForm } from '../RoomForm'
import Link from 'next/link'
import { ArrowLeft, DoorOpen } from 'lucide-react'

export default async function NewRoomPage() {
  const supabase = await createClient()
  const { data: buildings } = await supabase
    .from('buildings')
    .select('id, name, code, floor_count')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="p-6 max-w-3xl">
      {/* Back Button */}
      <Link 
        href="/admin/rooms"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar ruangan
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
          <DoorOpen className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tambah Ruangan Baru</h1>
          <p className="text-slate-500">Isi detail ruangan untuk menambahkan ke sistem</p>
        </div>
      </div>

      <RoomForm buildings={buildings ?? []} />
    </div>
  )
}
