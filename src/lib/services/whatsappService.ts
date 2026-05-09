interface WhatsAppMessage {
  to: string;
  message: string;
  mediaUrl?: string;
}

class WhatsAppService {
  private provider: string;

  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'twilio';
  }

  async sendMessage(options: WhatsAppMessage): Promise<{ success: boolean; error?: string }> {
    switch (this.provider) {
      case 'twilio':
        return this.sendViaTwilio(options);
      case 'meta':
        return this.sendViaMeta(options);
      default:
        // Default: generate wa.me link
        return this.generateWaMeLink(options);
    }
  }

  private async sendViaTwilio(options: WhatsAppMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials not configured');
      }

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${fromNumber}`,
          To: `whatsapp:${options.to}`,
          Body: options.message,
          ...(options.mediaUrl && { MediaUrl: options.mediaUrl }),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return { success: true };
    } catch (error: any) {
      console.error('WhatsApp Twilio sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private async sendViaMeta(options: WhatsAppMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken) {
        throw new Error('Meta WhatsApp credentials not configured');
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: options.to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: options.message },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return { success: true };
    } catch (error: any) {
      console.error('WhatsApp Meta sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  private generateWaMeLink(options: WhatsAppMessage): { success: boolean; error?: string; link?: string } {
    try {
      const phone = options.to.replace(/[^0-9]/g, '');
      const encodedMessage = encodeURIComponent(options.message);
      const link = `https://wa.me/${phone}?text=${encodedMessage}`;
      
      return { success: true, link };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Template generators
  generateBookingConfirmationMessage(booking: any): string {
    return `Halo ${booking.users?.name},

Terima kasih telah mengajukan peminjaman di RentSpace.

📋 *Detail Pengajuan:*
• No. Referensi: ${booking.reference_no}
• Status: Menunggu Konfirmasi ⏳
• Tanggal Mulai: ${new Date(booking.start_datetime).toLocaleString('id-ID')}
• Tanggal Selesai: ${new Date(booking.end_datetime).toLocaleString('id-ID')}
• Total: Rp ${booking.total_amount?.toLocaleString('id-ID')}

Kami akan segera memproses pengajuan Anda. Anda akan menerima notifikasi setelah peminjaman disetujui.

Jika ada pertanyaan, silakan balas pesan ini.

Terima kasih,
*RentSpace Team*`;
  }

  generateBookingApprovedMessage(booking: any): string {
    return `Halo ${booking.users?.name},

Selamat! 🎉 Pengajuan peminjaman Anda telah *DISETUJUI*.

📋 *Detail Peminjaman:*
• No. Referensi: ${booking.reference_no}
• Status: ✅ Disetujui
• Total Tagihan: Rp ${booking.total_amount?.toLocaleString('id-ID')}

*Langkah Selanjutnya:*
1️⃣ Lakukan pembayaran sesuai total tagihan
2️⃣ Upload bukti pembayaran di aplikasi
3️⃣ Tunggu verifikasi dari admin
4️⃣ Setelah lunas, peminjaman aktif

Segera lakukan pembayaran untuk mengamankan jadwal Anda.

Terima kasih,
*RentSpace Team*`;
  }

  generatePaymentConfirmationMessage(booking: any, payment: any): string {
    return `Halo ${booking.users?.name},

✅ *PEMBAYARAN BERHASIL!*

Pembayaran Anda telah kami terima dan terverifikasi.

💰 *Detail Pembayaran:*
• No. Referensi: ${booking.reference_no}
• Jumlah: Rp ${payment.amount?.toLocaleString('id-ID')}
• Metode: ${payment.method?.toUpperCase()}
• Waktu: ${new Date(payment.paid_at).toLocaleString('id-ID')}

✅ *STATUS: LUNAS*
Peminjaman Anda sudah aktif.

Simpan pesan ini sebagai bukti pembayaran.

Terima kasih,
*RentSpace Team*`;
  }

  generateReminderMessage(booking: any): string {
    return `Halo ${booking.users?.name},

⏰ *PENGINGAT PEMINJAMAN*

Peminjaman Anda akan segera dimulai:

📋 *Detail:*
• No. Referensi: ${booking.reference_no}
• Tanggal Mulai: ${new Date(booking.start_datetime).toLocaleString('id-ID')}
• Tanggal Selesai: ${new Date(booking.end_datetime).toLocaleString('id-ID')}

Jangan lupa untuk:
✅ Datang tepat waktu
✅ Bawa KTM/Kartu Identitas
✅ Jaga kebersihan dan keamanan fasilitas

Terima kasih,
*RentSpace Team*`;
  }
}

export const whatsappService = new WhatsAppService();
