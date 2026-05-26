'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ClipboardCheck } from 'lucide-react'
import { addEquipmentCheck } from './actions'

const CONDITIONS = [
  { value: 'good', label: 'Baik' },
  { value: 'needs_repair', label: 'Perlu Perbaikan' },
  { value: 'damaged', label: 'Rusak' },
  { value: 'lost', label: 'Hilang' },
]

interface Props {
  equipmentId: string
  slug: string
}

export function CheckForm({ equipmentId, slug }: Props) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const formData = new FormData(e.currentTarget)
    const result = await addEquipmentCheck(formData)

    setLoading(false)
    if (result.error) {
      setMessage(result.error)
    } else {
      setMessage('Pengecekan berhasil dicatat!')
      e.currentTarget.reset()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="equipment_id" value={equipmentId} />
      <input type="hidden" name="slug" value={slug} />

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
          Kondisi Saat Ini
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <label
              key={c.value}
              className="flex items-center gap-2 p-3 rounded-[10px] border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
            >
              <input
                type="radio"
                name="condition"
                value={c.value}
                required
                className="accent-[#2E4DA7]"
              />
              <span className="text-sm">{c.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
          Catatan Pengecekan
        </label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Contoh: Baterai masih bagus, ada goresan kecil pada body..."
          className="w-full rounded-[10px] border border-border bg-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E4DA7]/20 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">
          Nama Pemeriksa
        </label>
        <input
          type="text"
          name="checked_by_name"
          placeholder="Nama petugas pengecekan"
          className="w-full h-10 rounded-[10px] border border-border bg-muted/50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E4DA7]/20"
        />
      </div>

      {message && (
        <p className={`text-sm ${message.includes('berhasil') ? 'text-emerald-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-[#2E4DA7] hover:bg-[#1e3a8a] text-white font-medium rounded-lg"
      >
        <ClipboardCheck className="h-4 w-4 mr-2" />
        {loading ? 'Menyimpan...' : 'Catat Pengecekan'}
      </Button>
    </form>
  )
}
