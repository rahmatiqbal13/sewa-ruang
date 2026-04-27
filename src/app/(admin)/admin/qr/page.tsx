import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { QRCodeDisplay } from './QRCodeDisplay'

export default async function QRPage({ searchParams }: { searchParams: Promise<{ id?: string; type?: string }> }) {
  const { id, type } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assets } = await (supabase.from('assets') as any)
    .select('id, name, category, room_code, buildings(name)')
    .eq('is_active', true)
    .order('category')
    .order('name') as { data: Array<{id:string;name:string;category:string;room_code:string|null;buildings:{name:string}|null}> | null }

  const selectedAsset = assets?.find(a => a.id === id)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const url = selectedAsset
    ? selectedAsset.category === 'room'
      ? `${baseUrl}/rooms/${selectedAsset.id}/inventory`
      : `${baseUrl}/assets/${selectedAsset.id}/scan`
    : null

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">QR Code</h1>
        <Link href="/admin/qr/batch" className={buttonVariants({ variant: 'outline' })}>
          Cetak Label Massal
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
          <p className="text-sm font-medium">Pilih Aset</p>
          <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
            {assets?.map((a) => (
              <a
                key={a.id}
                href={`/admin/qr?id=${a.id}&type=${a.category}`}
                className={`flex flex-col px-4 py-3 border-b text-sm hover:bg-zinc-50 transition-colors ${a.id === id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
              >
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground text-xs">
                  {a.category === 'room' ? `Ruang — ${a.room_code ?? ''}` : 'Alat'}
                  {' '}{(a.buildings as {name:string}|null)?.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedAsset && url ? (
            <QRCodeDisplay
              url={url}
              name={selectedAsset.name}
              label={selectedAsset.room_code ?? selectedAsset.category}
              type={type ?? 'asset'}
            />
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
              Pilih aset dari daftar untuk generate QR Code
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
