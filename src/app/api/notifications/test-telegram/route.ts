import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('users') as any).select('role').eq('id', user.id).single()
  return ['admin', 'super_admin'].includes(data?.role ?? '')
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { bot_token, chat_id } = await req.json()

    if (!bot_token || !chat_id) {
      return NextResponse.json({ error: 'bot_token dan chat_id wajib diisi' }, { status: 400 })
    }

    const text = `✅ <b>Test Notifikasi</b>\n\nKonfigurasi Telegram berhasil terhubung!\n\n<i>Dikirim dari sistem Sewa Ruang &amp; Alat · ${new Date().toLocaleString('id-ID')}</i>`

    const res = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    })

    const data = await res.json()

    if (!data.ok) {
      return NextResponse.json({ error: data.description ?? 'Gagal mengirim pesan Telegram' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message_id: data.result?.message_id })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
