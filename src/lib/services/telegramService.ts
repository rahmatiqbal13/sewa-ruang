interface TelegramMessage {
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

class TelegramService {
  private botToken: string;
  private apiUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(options: TelegramMessage): Promise<{ success: boolean; messageId?: number; error?: string }> {
    try {
      if (!this.botToken) {
        throw new Error('Telegram bot token not configured');
      }

      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: options.chatId,
          text: options.message,
          parse_mode: options.parseMode || 'HTML',
          disable_web_page_preview: true,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Unknown error');
      }

      return {
        success: true,
        messageId: data.result.message_id,
      };
    } catch (error: any) {
      console.error('Telegram sending failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendPhoto(chatId: string, photoUrl: string, caption?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption,
          parse_mode: 'HTML',
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Unknown error');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Telegram photo sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getUpdates(): Promise<any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/getUpdates`);
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.description);
      }
      
      return data.result;
    } catch (error) {
      console.error('Failed to get updates:', error);
      return [];
    }
  }

  generateNotificationMessage(booking: any, type: 'new' | 'approved' | 'paid' | 'completed' | 'cancelled'): string {
    const statusEmojis: Record<string, string> = {
      new: '🆕',
      approved: '✅',
      paid: '💰',
      completed: '🎉',
      cancelled: '❌',
    };

    const statusText: Record<string, string> = {
      new: 'PENGAJUAN BARU',
      approved: 'DISETUJUI',
      paid: 'LUNAS',
      completed: 'SELESAI',
      cancelled: 'DIBATALKAN',
    };

    return `<b>${statusEmojis[type]} ${statusText[type]}</b>

👤 <b>${booking.users?.name}</b>
🏢 ${booking.users?.institution}
📋 <code>${booking.reference_no}</code>

📅 <b>Tanggal:</b>
• Mulai: ${new Date(booking.start_datetime).toLocaleString('id-ID')}
• Selesai: ${new Date(booking.end_datetime).toLocaleString('id-ID')}

💰 <b>Total:</b> Rp ${booking.total_amount?.toLocaleString('id-ID')}

<i>${new Date().toLocaleString('id-ID')}</i>`;
  }

  generateAdminNotification(booking: any): string {
    return `🆕 <b>PENGAJUAN BARU MASUK</b>

👤 <b>${booking.users?.name}</b>
📧 ${booking.users?.email}
📱 ${booking.users?.phone || '-'}
🏢 ${booking.users?.institution}

📋 <code>${booking.reference_no}</code>
📅 ${new Date(booking.start_datetime).toLocaleDateString('id-ID')}
💰 Rp ${booking.total_amount?.toLocaleString('id-ID')}

<a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/bookings/${booking.id}">Lihat Detail</a>`;
  }
}

export const telegramService = new TelegramService();
