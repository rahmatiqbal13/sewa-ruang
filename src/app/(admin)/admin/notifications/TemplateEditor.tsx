'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Mail, MessageSquare, Send, GraduationCap, Users, Building, Briefcase, Handshake } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveTemplate } from './templateActions'

type Channel = 'email' | 'whatsapp' | 'telegram'
type UserCategory = 'default' | 'mahasiswa_s1' | 'mahasiswa_s2' | 'dosen_karyawan' | 'umum' | 'kerjasama'

interface Template {
  id?: string
  event_type: string
  channel: Channel
  user_category: string
  subject?: string | null
  body: string
  is_active: boolean
}

const EVENT_TYPES = [
  { key: 'booking_submitted', label: 'Pengajuan Baru', desc: 'Saat peminjam mengajukan peminjaman baru' },
  { key: 'booking_approved', label: 'Pengajuan Disetujui', desc: 'Saat admin menyetujui pengajuan' },
  { key: 'booking_rejected', label: 'Pengajuan Ditolak', desc: 'Saat admin menolak pengajuan' },
  { key: 'booking_cancelled', label: 'Pengajuan Dibatalkan', desc: 'Saat peminjam atau admin membatalkan' },
  { key: 'payment_received', label: 'Pembayaran Diterima', desc: 'Saat pembayaran dikonfirmasi oleh admin' },
  { key: 'booking_reminder', label: 'Pengingat Jadwal', desc: 'Pengingat H-1 sebelum jadwal peminjaman' },
]

const CHANNELS: { key: Channel; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'email', label: 'Email', icon: Mail, color: 'text-blue-600' },
  { key: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600' },
  { key: 'telegram', label: 'Telegram', icon: Send, color: 'text-sky-500' },
]

const USER_CATEGORIES: { key: UserCategory; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'default', label: 'Default (Semua)', icon: Users, desc: 'Template default untuk semua kategori' },
  { key: 'mahasiswa_s1', label: 'Mahasiswa S1', icon: GraduationCap, desc: 'Template khusus untuk Mahasiswa S1' },
  { key: 'mahasiswa_s2', label: 'Mahasiswa S2/S3', icon: GraduationCap, desc: 'Template untuk Mahasiswa Pascasarjana' },
  { key: 'dosen_karyawan', label: 'Dosen/Karyawan', icon: Briefcase, desc: 'Template untuk Dosen dan Karyawan' },
  { key: 'umum', label: 'Umum', icon: Users, desc: 'Template untuk pengguna umum' },
  { key: 'kerjasama', label: 'Kerjasama/MoU', icon: Handshake, desc: 'Template untuk institusi kerjasama' },
]

const VARIABLES = [
  { key: '{{nama}}', desc: 'Nama peminjam' },
  { key: '{{no_booking}}', desc: 'No. referensi booking' },
  { key: '{{ruangan}}', desc: 'Semua ruangan & alat (tergabung)' },
  { key: '{{daftar_ruangan}}', desc: 'Daftar ruangan saja (dengan nomor)' },
  { key: '{{daftar_alat}}', desc: 'Daftar alat saja (dengan nomor)' },
  { key: '{{jumlah_ruangan}}', desc: 'Jumlah ruangan (angka)' },
  { key: '{{jumlah_alat}}', desc: 'Jumlah alat (angka)' },
  { key: '{{tanggal_mulai}}', desc: 'Tanggal & jam mulai' },
  { key: '{{tanggal_selesai}}', desc: 'Tanggal & jam selesai' },
  { key: '{{status}}', desc: 'Status booking' },
  { key: '{{catatan_admin}}', desc: 'Catatan dari admin' },
  { key: '{{kategori_pengguna}}', desc: 'Kategori pengguna (Mahasiswa S1, Dosen, dll)' },
  { key: '{{total_biaya}}', desc: 'Total biaya peminjaman' },
  { key: '{{tipe_peminjaman}}', desc: 'Tipe: Ruangan saja/Alat saja/Campuran' },
]

// Default templates per user category
const DEFAULT_BODIES: Record<string, Record<Channel, Record<UserCategory, { subject?: string; body: string }>>> = {
  booking_submitted: {
    email: {
      default: {
        subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima',
        body: 'Halo {{nama}},\n\nPengajuan peminjaman Anda telah kami terima dengan detail:\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n⏰ Status: Menunggu Persetujuan\n\nKami akan segera memproses pengajuan Anda.\n\nTerima kasih,\nTim Admin USC',
      },
      mahasiswa_s1: {
        subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima (Mahasiswa S1)',
        body: 'Halo {{nama}},\n\nPengajuan peminjaman Anda telah kami terima.\n\nSebagai Mahasiswa S1, Anda berhak mendapatkan peminjaman GRATIS untuk keperluan perkuliahan.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n\nKami akan segera memverifikasi pengajuan Anda.\n\nTerima kasih,\nTim Admin USC',
      },
      mahasiswa_s2: {
        subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima',
        body: 'Halo {{nama}},\n\nPengajuan peminjaman Anda telah kami terima.\n\nSebagai Mahasiswa Pascasarjana, silakan tunggu konfirmasi dari kami.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n⏰ Status: Menunggu Persetujuan\n\nTerima kasih,\nTim Admin USC',
      },
      dosen_karyawan: {
        subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima',
        body: 'Halo {{nama}},\n\nPengajuan peminjaman Anda telah kami terima.\n\nSebagai Dosen/Karyawan UNESA, Anda mendapatkan prioritas dalam proses persetujuan.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n⏰ Status: Menunggu Persetujuan\n\nTerima kasih,\nTim Admin USC',
      },
      umum: {
        subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima',
        body: 'Halo {{nama}},\n\nPengajuan peminjaman Anda telah kami terima.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n⏰ Status: Menunggu Persetujuan\n\nSilakan lakukan pembayaran setelah pengajuan disetujui.\n\nTerima kasih,\nTim Admin USC',
      },
      kerjasama: {
        subject: '{{nama}} - {{no_booking}} | Pengajuan Diterima (Kerjasama)',
        body: 'Halo {{nama}},\n\nPengajuan peminjaman dari institusi kerjasama Anda telah kami terima.\n\nSebagai mitra kerjasama, Anda mendapatkan tarif khusus.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n⏰ Status: Menunggu Persetujuan\n\nTerima kasih,\nTim Admin USC',
      },
    },
    whatsapp: {
      default: { body: 'Halo {{nama}}! Pengajuan peminjaman *{{ruangan}}* (Ref: {{no_booking}}) untuk {{tanggal_mulai}} s/d {{tanggal_selesai}} telah kami terima dan sedang diproses. Kami akan segera memberikan konfirmasi. Terima kasih!' },
      mahasiswa_s1: { body: 'Halo {{nama}}! Pengajuan *{{no_booking}}* telah diterima. Sebagai Mahasiswa S1, Anda bisa meminjam GRATIS untuk perkuliahan. Kami akan segera memverifikasi. Terima kasih!' },
      mahasiswa_s2: { body: 'Halo {{nama}}! Pengajuan *{{no_booking}}* telah diterima dan sedang diproses. Kami akan segera memberikan konfirmasi. Terima kasih!' },
      dosen_karyawan: { body: 'Halo {{nama}}! Pengajuan *{{no_booking}}* telah diterima. Sebagai Dosen/Karyawan, Anda mendapat prioritas proses. Kami akan segera konfirmasi. Terima kasih!' },
      umum: { body: 'Halo {{nama}}! Pengajuan *{{no_booking}}* telah diterima. Silakan tunggu persetujuan dan lakukan pembayaran. Terima kasih!' },
      kerjasama: { body: 'Halo {{nama}}! Pengajuan *{{no_booking}}* dari institusi kerjasama telah diterima. Anda mendapat tarif khusus. Kami akan segera konfirmasi. Terima kasih!' },
    },
    telegram: {
      default: { body: '📋 Halo {{nama}}!\n\nPengajuan peminjaman *{{ruangan}}* (Ref: `{{no_booking}}`) telah diterima dan sedang diproses.\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nKami akan segera memberikan konfirmasi.' },
      mahasiswa_s1: { body: '📋 Halo {{nama}}!\n\nPengajuan *{{no_booking}}* diterima.\n\nSebagai Mahasiswa S1, peminjaman untuk perkuliahan GRATIS!\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nKami akan verifikasi segera.' },
      mahasiswa_s2: { body: '📋 Halo {{nama}}!\n\nPengajuan *{{no_booking}}* diterima dan diproses.\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nTunggu konfirmasi dari kami.' },
      dosen_karyawan: { body: '📋 Halo {{nama}}!\n\nPengajuan *{{no_booking}}* diterima.\n\nPrioritas Dosen/Karyawan UNESA.\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSegera kami proses.' },
      umum: { body: '📋 Halo {{nama}}!\n\nPengajuan *{{no_booking}}* diterima.\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nTunggu persetujuan dan lakukan pembayaran.' },
      kerjasama: { body: '📋 Halo {{nama}}!\n\nPengajuan *{{no_booking}}* diterima.\n\nMitra Kerjasama - Tarif Khusus\n\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSegera kami proses.' },
    },
  },
  booking_approved: {
    email: {
      default: {
        subject: '{{nama}} - {{no_booking}} | ✅ Disetujui',
        body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: Disetujui\n\nSilakan lakukan pembayaran untuk mengkonfirmasi peminjaman.\n\nTerima kasih,\nTim Admin USC',
      },
      mahasiswa_s1: {
        subject: '{{nama}} - {{no_booking}} | ✅ Disetujui & LUNAS (Gratis)',
        body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI dan LUNAS.\n\nSebagai Mahasiswa S1 untuk keperluan perkuliahan, peminjaman ini GRATIS.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: DISETUJUI & LUNAS\n💰 Biaya: GRATIS\n\nPeminjaman Anda telah dikonfirmasi. Harap datang tepat waktu.\n\nTerima kasih,\nTim Admin USC',
      },
      mahasiswa_s2: {
        subject: '{{nama}} - {{no_booking}} | ✅ Disetujui',
        body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: Disetujui\n\nSilakan lakukan pembayaran untuk mengkonfirmasi peminjaman.\n\nTerima kasih,\nTim Admin USC',
      },
      dosen_karyawan: {
        subject: '{{nama}} - {{no_booking}} | ✅ Disetujui',
        body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI.\n\nSebagai Dosen/Karyawan, Anda mendapatkan kemudahan dalam proses peminjaman.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: Disetujui\n\nSilakan lakukan pembayaran untuk mengkonfirmasi.\n\nTerima kasih,\nTim Admin USC',
      },
      umum: {
        subject: '{{nama}} - {{no_booking}} | ✅ Disetujui',
        body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: Disetujui\n\nSegera lakukan pembayaran untuk mengamankan jadwal Anda.\n\nTerima kasih,\nTim Admin USC',
      },
      kerjasama: {
        subject: '{{nama}} - {{no_booking}} | ✅ Disetujui (Kerjasama)',
        body: 'Halo {{nama}},\n\nSelamat! Pengajuan peminjaman Anda telah DISETUJUI.\n\nSebagai mitra kerjasama, Anda mendapatkan tarif khusus yang lebih hemat.\n\n📋 No. Booking: {{no_booking}}\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}\n✅ Status: Disetujui\n\nSilakan lakukan pembayaran untuk mengkonfirmasi.\n\nTerima kasih,\nTim Admin USC',
      },
    },
    whatsapp: {
      default: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
      mahasiswa_s1: { body: '🎓 Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI & LUNAS!\n\nSebagai Mahasiswa S1, peminjaman ini GRATIS untuk perkuliahan.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\n✅ Sudah dikonfirmasi, datang tepat waktu!' },
      mahasiswa_s2: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
      dosen_karyawan: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI.\n\nPrioritas Dosen/Karyawan.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
      umum: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSegera lakukan pembayaran untuk mengamankan jadwal.' },
      kerjasama: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah DISETUJUI.\n\nMitra Kerjasama - Tarif Khusus\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
    },
    telegram: {
      default: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI*.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
      mahasiswa_s1: { body: '🎓 Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI* & *LUNAS*!\n\nGRATIS untuk Mahasiswa S1 (Perkuliahan)\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\n✅ Sudah dikonfirmasi!' },
      mahasiswa_s2: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI*.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
      dosen_karyawan: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI*.\n\nPrioritas Dosen/Karyawan\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
      umum: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI*.\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSegera lakukan pembayaran untuk mengamankan jadwal.' },
      kerjasama: { body: '✅ Selamat {{nama}}!\n\nPengajuan *{{no_booking}}* telah *DISETUJUI*.\n\nMitra Kerjasama\n\n🏢 {{daftar_ruangan}}\n{{daftar_alat}}\n📅 {{tanggal_mulai}} — {{tanggal_selesai}}\n\nSilakan lakukan pembayaran untuk konfirmasi.' },
    },
  },
  booking_rejected: {
    email: {
      default: {
        subject: '{{nama}} - {{no_booking}} | ❌ Ditolak',
        body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi kami untuk informasi lebih lanjut.

Terima kasih,
Tim Admin USC`,
      },
      mahasiswa_s1: {
        subject: '{{nama}} - {{no_booking}} | ❌ Ditolak',
        body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Jika Anda mahasiswa S1, pastikan pengajuan untuk keperluan perkuliahan dan sesuai prosedur.

Silakan hubungi kami untuk informasi lebih lanjut.

Terima kasih,
Tim Admin USC`,
      },
      mahasiswa_s2: { subject: '{{nama}} - {{no_booking}} | ❌ Ditolak', body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi kami untuk informasi lebih lanjut.

Terima kasih,
Tim Admin USC` },
      dosen_karyawan: { subject: '{{nama}} - {{no_booking}} | ❌ Ditolak', body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi admin untuk alternatif jadwal atau ruangan lain.

Terima kasih,
Tim Admin USC` },
      umum: { subject: '{{nama}} - {{no_booking}} | ❌ Ditolak', body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan ajukan kembali dengan jadwal atau ruangan alternatif.

Terima kasih,
Tim Admin USC` },
      kerjasama: { subject: '{{nama}} - {{no_booking}} | ❌ Ditolak', body: `Halo {{nama}},

Mohon maaf, pengajuan peminjaman Anda tidak dapat disetujui.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi kami untuk membahas alternatif yang tersedia.

Terima kasih,
Tim Admin USC` },
    },
    whatsapp: {
      default: { body: `Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}

Silakan hubungi admin untuk informasi lebih lanjut.` },
      mahasiswa_s1: { body: `Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}

Jika untuk perkuliahan, silakan hubungi admin untuk bantuan.` },
      mahasiswa_s2: { body: `Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Silakan hubungi admin untuk informasi lebih lanjut.` },
      dosen_karyawan: { body: `Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}

Silakan hubungi admin untuk alternatif.` },
      umum: { body: `Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}

Silakan ajukan kembali.` },
      kerjasama: { body: `Mohon maaf {{nama}}, pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}

Silakan hubungi kami untuk alternatif.` },
    },
    telegram: {
      default: { body: `❌ Mohon maaf {{nama}},

Pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}` },
      mahasiswa_s1: { body: `❌ Mohon maaf {{nama}},

Pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}` },
      mahasiswa_s2: { body: `❌ Mohon maaf {{nama}},

Pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}` },
      dosen_karyawan: { body: `❌ Mohon maaf {{nama}},

Pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}` },
      umum: { body: `❌ Mohon maaf {{nama}},

Pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}` },
      kerjasama: { body: `❌ Mohon maaf {{nama}},

Pengajuan *{{no_booking}}* tidak dapat disetujui.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

{{catatan_admin}}` },
    },
  },
  booking_cancelled: {
    email: {
      default: { subject: '{{nama}} - {{no_booking}} | 🚫 Dibatalkan', body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Jika Anda memiliki pertanyaan, silakan hubungi kami.

Terima kasih,
Tim Admin USC` },
      mahasiswa_s1: { subject: '{{nama}} - {{no_booking}} | 🚫 Dibatalkan', body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Jika pembatalan dilakukan oleh sistem, silakan hubungi admin untuk pengajuan ulang.

Terima kasih,
Tim Admin USC` },
      mahasiswa_s2: { subject: '{{nama}} - {{no_booking}} | 🚫 Dibatalkan', body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Terima kasih,
Tim Admin USC` },
      dosen_karyawan: { subject: '{{nama}} - {{no_booking}} | 🚫 Dibatalkan', body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi kami jika ingin menjadwalkan ulang.

Terima kasih,
Tim Admin USC` },
      umum: { subject: '{{nama}} - {{no_booking}} | 🚫 Dibatalkan', body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Terima kasih,
Tim Admin USC` },
      kerjasama: { subject: '{{nama}} - {{no_booking}} | 🚫 Dibatalkan', body: `Halo {{nama}},

Peminjaman Anda telah dibatalkan.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi kami untuk penjadwalan ulang.

Terima kasih,
Tim Admin USC` },
    },
    whatsapp: {
      default: { body: `Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

{{catatan_admin}}` },
      mahasiswa_s1: { body: `Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

{{catatan_admin}}

Silakan hubungi admin jika ingin mengajukan ulang.` },
      mahasiswa_s2: { body: `Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      dosen_karyawan: { body: `Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

{{catatan_admin}}` },
      umum: { body: `Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      kerjasama: { body: `Halo {{nama}}, peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

{{catatan_admin}}` },
    },
    telegram: {
      default: { body: `🚫 Peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      mahasiswa_s1: { body: `🚫 Peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      mahasiswa_s2: { body: `🚫 Peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      dosen_karyawan: { body: `🚫 Peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      umum: { body: `🚫 Peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
      kerjasama: { body: `🚫 Peminjaman *{{no_booking}}* telah dibatalkan.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}` },
    },
  },
  payment_received: {
    email: {
      default: { subject: '{{nama}} - {{no_booking}} | 💳 Lunas', body: `Halo {{nama}},

Pembayaran untuk peminjaman Anda telah kami terima.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💳 Status: LUNAS & DIKONFIRMASI

Peminjaman Anda telah dikonfirmasi. Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      mahasiswa_s1: { subject: '{{nama}} - {{no_booking}} | ✅ Konfirmasi Gratis', body: `Halo {{nama}},

Peminjaman Anda telah dikonfirmasi LUNAS.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💰 Biaya: GRATIS (Mahasiswa S1)
✅ Status: LUNAS & DIKONFIRMASI

Peminjaman telah dikonfirmasi. Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      mahasiswa_s2: { subject: '{{nama}} - {{no_booking}} | 💳 Lunas', body: `Halo {{nama}},

Pembayaran untuk peminjaman Anda telah kami terima.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💳 Status: LUNAS & DIKONFIRMASI

Peminjaman Anda telah dikonfirmasi. Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      dosen_karyawan: { subject: '{{nama}} - {{no_booking}} | 💳 Lunas', body: `Halo {{nama}},

Pembayaran untuk peminjaman Anda telah kami terima.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💳 Status: LUNAS & DIKONFIRMASI

Peminjaman Anda telah dikonfirmasi. Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      umum: { subject: '{{nama}} - {{no_booking}} | 💳 Lunas', body: `Halo {{nama}},

Pembayaran untuk peminjaman Anda telah kami terima.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💳 Status: LUNAS & DIKONFIRMASI

Peminjaman Anda telah dikonfirmasi. Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      kerjasama: { subject: '{{nama}} - {{no_booking}} | 💳 Lunas', body: `Halo {{nama}},

Pembayaran untuk peminjaman Anda telah kami terima.

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Tanggal: {{tanggal_mulai}} s/d {{tanggal_selesai}}
💳 Status: LUNAS & DIKONFIRMASI

Peminjaman Anda telah dikonfirmasi. Terima kasih atas kerjasamanya.

Terima kasih,
Tim Admin USC` },
    },
    whatsapp: {
      default: { body: `💳 Halo {{nama}}! Pembayaran untuk *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Peminjaman dikonfirmasi. Harap datang tepat waktu!` },
      mahasiswa_s1: { body: `✅ Halo {{nama}}! Peminjaman *{{no_booking}}* telah LUNAS (Gratis untuk Mahasiswa S1).

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Peminjaman dikonfirmasi!` },
      mahasiswa_s2: { body: `💳 Halo {{nama}}! Pembayaran untuk *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Peminjaman dikonfirmasi!` },
      dosen_karyawan: { body: `💳 Halo {{nama}}! Pembayaran untuk *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Peminjaman dikonfirmasi!` },
      umum: { body: `💳 Halo {{nama}}! Pembayaran untuk *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Peminjaman dikonfirmasi!` },
      kerjasama: { body: `💳 Halo {{nama}}! Pembayaran untuk *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Terima kasih atas kerjasamanya!` },
    },
    telegram: {
      default: { body: `💳 Halo {{nama}}!

Pembayaran *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

✅ Peminjaman dikonfirmasi.` },
      mahasiswa_s1: { body: `✅ Halo {{nama}}!

Peminjaman *{{no_booking}}* telah LUNAS (Gratis).

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

Peminjaman dikonfirmasi.` },
      mahasiswa_s2: { body: `💳 Halo {{nama}}!

Pembayaran *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

✅ Peminjaman dikonfirmasi.` },
      dosen_karyawan: { body: `💳 Halo {{nama}}!

Pembayaran *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

✅ Peminjaman dikonfirmasi.` },
      umum: { body: `💳 Halo {{nama}}!

Pembayaran *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

✅ Peminjaman dikonfirmasi.` },
      kerjasama: { body: `💳 Halo {{nama}}!

Pembayaran *{{no_booking}}* telah diterima.

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}} — {{tanggal_selesai}}

✅ Terima kasih atas kerjasamanya.` },
    },
  },
  booking_reminder: {
    email: {
      default: { subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat', body: `Halo {{nama}},

Ini adalah pengingat bahwa peminjaman Anda akan segera dimulai:

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Mulai: {{tanggal_mulai}}
📅 Selesai: {{tanggal_selesai}}

Harap datang tepat waktu sesuai jadwal.

Terima kasih,
Tim Admin USC` },
      mahasiswa_s1: { subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat', body: `Halo {{nama}},

⏰ Pengingat: Peminjaman Anda akan dimulai besok!

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Mulai: {{tanggal_mulai}}
📅 Selesai: {{tanggal_selesai}}

Pastikan Anda datang tepat waktu dan membawa kartu identitas.

Terima kasih,
Tim Admin USC` },
      mahasiswa_s2: { subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat', body: `Halo {{nama}},

⏰ Pengingat: Peminjaman Anda akan dimulai besok!

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Mulai: {{tanggal_mulai}}
📅 Selesai: {{tanggal_selesai}}

Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      dosen_karyawan: { subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat', body: `Halo {{nama}},

⏰ Pengingat: Peminjaman Anda akan dimulai besok!

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Mulai: {{tanggal_mulai}}
📅 Selesai: {{tanggal_selesai}}

Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      umum: { subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat', body: `Halo {{nama}},

⏰ Pengingat: Peminjaman Anda akan dimulai besok!

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Mulai: {{tanggal_mulai}}
📅 Selesai: {{tanggal_selesai}}

Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
      kerjasama: { subject: '{{nama}} - {{no_booking}} | ⏰ Pengingat', body: `Halo {{nama}},

⏰ Pengingat: Peminjaman Anda akan dimulai besok!

📋 No. Booking: {{no_booking}}
🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 Mulai: {{tanggal_mulai}}
📅 Selesai: {{tanggal_selesai}}

Harap datang tepat waktu.

Terima kasih,
Tim Admin USC` },
    },
    whatsapp: {
      default: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai:

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}}

Harap datang tepat waktu!` },
      mahasiswa_s1: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai besok:

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}}

Jangan lupa bawa KTM!` },
      mahasiswa_s2: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai:

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}}

Harap datang tepat waktu!` },
      dosen_karyawan: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai:

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}}

Harap datang tepat waktu!` },
      umum: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai:

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}}

Harap datang tepat waktu!` },
      kerjasama: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}! Peminjaman *{{no_booking}}* akan dimulai:

🏢 {{daftar_ruangan}}
{{daftar_alat}}
📅 {{tanggal_mulai}}

Harap datang tepat waktu!` },
    },
    telegram: {
      default: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}!

Peminjaman *{{no_booking}}* dimulai {{tanggal_mulai}}.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Harap datang tepat waktu!` },
      mahasiswa_s1: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}!

Peminjaman *{{no_booking}}* dimulai besok {{tanggal_mulai}}.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Jangan lupa bawa KTM!` },
      mahasiswa_s2: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}!

Peminjaman *{{no_booking}}* dimulai {{tanggal_mulai}}.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Harap datang tepat waktu!` },
      dosen_karyawan: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}!

Peminjaman *{{no_booking}}* dimulai {{tanggal_mulai}}.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Harap datang tepat waktu!` },
      umum: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}!

Peminjaman *{{no_booking}}* dimulai {{tanggal_mulai}}.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Harap datang tepat waktu!` },
      kerjasama: { body: `⏰ *Pengingat Peminjaman*

Halo {{nama}}!

Peminjaman *{{no_booking}}* dimulai {{tanggal_mulai}}.

🏢 {{daftar_ruangan}}
{{daftar_alat}}

Harap datang tepat waktu!` },
    },
  },
}

// Helper function to get default body
function getDefaultBody(eventType: string, channel: Channel, userCategory: UserCategory): { subject: string; body: string } {
  const eventDefaults = DEFAULT_BODIES[eventType]
  if (!eventDefaults) return { subject: '', body: '' }
  
  const channelDefaults = eventDefaults[channel]
  if (!channelDefaults) return { subject: '', body: '' }
  
  const categoryDefaults = channelDefaults[userCategory] || channelDefaults.default
  return { subject: categoryDefaults?.subject || '', body: categoryDefaults?.body || '' }
}

type TemplateData = { subject: string; body: string }
type CategoryMap = Record<UserCategory, TemplateData>
type ChannelMap = Record<Channel, CategoryMap>
type EventMap = Record<string, ChannelMap>

export function TemplateEditor({ templates }: { templates: Template[] }) {
  const [selectedEvent, setSelectedEvent] = useState(EVENT_TYPES[0].key)
  const [activeChannel, setActiveChannel] = useState<Channel>('email')
  const [activeCategory, setActiveCategory] = useState<UserCategory>('default')
  const [loading, setLoading] = useState(false)

  const [data, setData] = useState<EventMap>(() => {
    const map: EventMap = {}
    
    // Initialize with defaults
    EVENT_TYPES.forEach(e => {
      map[e.key] = {} as Record<Channel, Record<UserCategory, { subject: string; body: string }>>
      CHANNELS.forEach(ch => {
        map[e.key][ch.key] = {} as Record<UserCategory, { subject: string; body: string }>
        USER_CATEGORIES.forEach(cat => {
          const defaults = getDefaultBody(e.key, ch.key, cat.key)
          map[e.key][ch.key][cat.key] = { subject: defaults.subject ?? '', body: defaults.body }
        })
      })
    })
    
    // Override with saved templates
    templates.forEach(t => {
      if (!map[t.event_type]) return
      if (!map[t.event_type][t.channel]) return
      const category = (t.user_category as UserCategory) || 'default'
      map[t.event_type][t.channel][category] = { 
        subject: t.subject ?? '', 
        body: t.body 
      }
    })
    
    return map
  })

  function insertVariable(v: string) {
    const key = `${selectedEvent}-${activeChannel}-${activeCategory}`
    const ta = document.getElementById(key) as HTMLTextAreaElement | null
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const current = data[selectedEvent][activeChannel][activeCategory].body
    const next = current.slice(0, start) + v + current.slice(end)
    setData(p => ({ 
      ...p, 
      [selectedEvent]: { 
        ...p[selectedEvent], 
        [activeChannel]: { 
          ...p[selectedEvent][activeChannel], 
          [activeCategory]: { 
            ...p[selectedEvent][activeChannel][activeCategory], 
            body: next 
          } 
        } 
      } 
    }))
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + v.length, start + v.length) }, 10)
  }

  async function save() {
    setLoading(true)
    const current = data[selectedEvent][activeChannel][activeCategory]
    
    const result = await saveTemplate({
      event_type: selectedEvent,
      channel: activeChannel,
      user_category: activeCategory,
      subject: activeChannel === 'email' ? current.subject : null,
      body: current.body,
    })
    
    if (result.error) {
      toast.error('Gagal menyimpan: ' + result.error)
    } else {
      toast.success(`Template untuk ${USER_CATEGORIES.find(c => c.key === activeCategory)?.label} disimpan`)
    }
    
    setLoading(false)
  }

  const eventMeta = EVENT_TYPES.find(e => e.key === selectedEvent)!
  const categoryMeta = USER_CATEGORIES.find(c => c.key === activeCategory)!
  const current = data[selectedEvent]?.[activeChannel]?.[activeCategory] ?? { subject: '', body: '' }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
      {/* Event list */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 mb-2">Jenis Event</p>
          {EVENT_TYPES.map(e => (
            <button
              key={e.key}
              onClick={() => setSelectedEvent(e.key)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-[10px] text-sm transition-colors mb-1',
                selectedEvent === e.key
                  ? 'bg-blue-950 text-white font-medium'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template editor */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">{eventMeta.label}</h3>
          <p className="text-sm text-muted-foreground">{eventMeta.desc}</p>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {USER_CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeCategory === cat.key
                    ? 'border-blue-950 text-blue-950'
                    : 'border-transparent text-muted-foreground hover:text-foreground/80'
                )}
                title={cat.desc}
              >
                <Icon className={cn('h-4 w-4', activeCategory === cat.key ? 'text-blue-600' : '')} />
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 border-b">
          {CHANNELS.map(ch => {
            const Icon = ch.icon
            return (
              <button
                key={ch.key}
                onClick={() => setActiveChannel(ch.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeChannel === ch.key
                    ? 'border-blue-950 text-blue-950'
                    : 'border-transparent text-muted-foreground hover:text-foreground/80'
                )}
              >
                <Icon className={cn('h-4 w-4', activeChannel === ch.key ? ch.color : '')} />
                {ch.label}
              </button>
            )
          })}
        </div>

        {/* Category info */}
        <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-3">
          <div className="flex items-center gap-2">
            <categoryMeta.icon className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm text-blue-900">{categoryMeta.label}</span>
          </div>
          <p className="text-xs text-blue-700 mt-1">{categoryMeta.desc}</p>
        </div>

        {/* Subject (email only) */}
        {activeChannel === 'email' && (
          <div className="space-y-1.5">
            <Label className="text-sm">Subject Email</Label>
            <Input
              placeholder="Subject email..."
              value={current.subject}
              onChange={e => setData(p => ({ 
                ...p, 
                [selectedEvent]: { 
                  ...p[selectedEvent], 
                  [activeChannel]: { 
                    ...p[selectedEvent][activeChannel], 
                    [activeCategory]: { 
                      ...current, 
                      subject: e.target.value 
                    } 
                  } 
                } 
              }))}
            />
          </div>
        )}

        {/* Body */}
        <div className="space-y-1.5">
          <Label className="text-sm">Isi Pesan</Label>
          <Textarea
            id={`${selectedEvent}-${activeChannel}-${activeCategory}`}
            rows={10}
            placeholder={`Tulis pesan notifikasi untuk ${categoryMeta.label} di sini...`}
            value={current.body}
            onChange={e => setData(p => ({ 
              ...p, 
              [selectedEvent]: { 
                ...p[selectedEvent], 
                [activeChannel]: { 
                  ...p[selectedEvent][activeChannel], 
                  [activeCategory]: { 
                    ...current, 
                    body: e.target.value 
                  } 
                } 
              } 
            }))}
            className="font-mono text-sm resize-none"
          />
        </div>

        {/* Variable chips */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Klik variabel untuk menyisipkan ke posisi kursor:</p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map(v => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                title={v.desc}
                className="text-xs font-mono bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded transition-colors"
              >
                {v.key}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-1">
            {VARIABLES.map(v => (
              <p key={v.key} className="text-xs text-muted-foreground"><span className="font-mono text-muted-foreground">{v.key}</span> = {v.desc}</p>
            ))}
          </div>
        </div>

        <Button onClick={save} disabled={loading} className="bg-blue-950 hover:bg-blue-900">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Template untuk {categoryMeta.label}
        </Button>
      </div>
    </div>
  )
}

