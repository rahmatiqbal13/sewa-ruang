import nodemailer from 'nodemailer'

interface EmailConfig {
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_pass: string
  from_name: string
  from_email: string
}

interface WhatsAppConfig {
  api_url: string
  api_token: string
  sender_number?: string
}

interface TelegramConfig {
  bot_token: string
  admin_chat_id?: string
}

export async function sendEmail(cfg: EmailConfig, to: string, subject: string, body: string) {
  const transporter = nodemailer.createTransport({
    host: cfg.smtp_host,
    port: parseInt(cfg.smtp_port || '587'),
    secure: cfg.smtp_port === '465',
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
  })
  await transporter.sendMail({
    from: `"${cfg.from_name}" <${cfg.from_email}>`,
    to,
    subject,
    text: body,
    html: body.replace(/\n/g, '<br>'),
  })
}

export async function sendWhatsApp(cfg: WhatsAppConfig, to: string, message: string) {
  if (!cfg.api_url || !cfg.api_token || !to) return
  await fetch(cfg.api_url, {
    method: 'POST',
    headers: { Authorization: cfg.api_token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: to, message }),
  })
}

export async function sendTelegram(cfg: TelegramConfig, chatId: string, message: string) {
  if (!cfg.bot_token || !chatId) return
  await fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  })
}

export function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}
