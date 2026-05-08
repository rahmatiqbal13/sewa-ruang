'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import nodemailer from 'nodemailer'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Email tidak valid'),
})

// Initialize Redis and Rate Limiter only if env vars are available
const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

const redis = redisUrl && redisToken 
  ? new Redis({ url: redisUrl, token: redisToken })
  : null

const ratelimit = redis 
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '15 m'), // 3 requests per 15 minutes
      analytics: true,
    })
  : null

export interface PasswordResetResult {
  success: boolean
  message: string
  email?: string
}

/**
 * Send password reset email with custom template
 * Uses Supabase Auth to generate recovery token and custom SMTP for email delivery
 */
export async function sendPasswordResetEmail(
  prevState: PasswordResetResult,
  formData: FormData
): Promise<PasswordResetResult> {
  try {
    // Parse and validate email
    const email = formData.get('email') as string
    
    if (!email) {
      return {
        success: false,
        message: 'Email wajib diisi',
      }
    }
    
    const validation = schema.safeParse({ email })
    
    if (!validation.success) {
      return {
        success: false,
        message: 'Email tidak valid',
      }
    }

    // Check rate limit if Redis is configured
    if (ratelimit) {
      const identifier = `password-reset:${email.toLowerCase()}`
      const { success: rateLimitSuccess, reset } = await ratelimit.limit(identifier)
      
      if (!rateLimitSuccess) {
        const resetMinutes = Math.ceil((reset - Date.now()) / 60000)
        return {
          success: false,
          message: `Terlalu banyak permintaan. Silakan coba lagi dalam ${resetMinutes} menit.`,
        }
      }
    }

    // Create admin client to generate password reset link
    const supabase = await createAdminClient()
    
    // Check if user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', email)
      .single()
    
    if (userError || !userData) {
      // Don't reveal whether email exists for security
      // But still return success to prevent email enumeration
      return {
        success: true,
        message: 'Jika email terdaftar, link reset password akan dikirim.',
        email,
      }
    }

    // Generate password reset link using Supabase Auth Admin API
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
      },
    })

    if (linkError || !linkData.properties?.action_link) {
      console.error('Error generating reset link:', linkError)
      return {
        success: false,
        message: 'Gagal membuat link reset password. Silakan coba lagi.',
      }
    }

    const resetLink = linkData.properties.action_link

    // Send custom email using SMTP
    await sendCustomResetEmail({
      to: email,
      name: userData.name || email.split('@')[0],
      resetLink,
    })

    return {
      success: true,
      message: 'Link reset password telah dikirim ke email Anda.',
      email,
    }
  } catch (error) {
    console.error('Password reset error:', error)
    return {
      success: false,
      message: 'Terjadi kesalahan. Silakan coba lagi nanti.',
    }
  }
}

/**
 * Send custom password reset email using SMTP
 */
async function sendCustomResetEmail({
  to,
  name,
  resetLink,
}: {
  to: string
  name: string
  resetLink: string
}) {
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Sistem Sewa Ruang & Alat'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const emailHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - ${appName}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .button { width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" class="container" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${appName}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #18181b; margin: 0 0 20px; font-size: 22px; font-weight: 600;">Halo, ${name}!</h2>
              
              <p style="color: #52525b; margin: 0 0 24px; font-size: 16px; line-height: 1.6;">
                Kami menerima permintaan untuk mereset password akun Anda. Klik tombol di bawah untuk membuat password baru:
              </p>
              
              <table role="presentation" style="margin: 32px 0;">
                <tr>
                  <td>
                    <a href="${resetLink}" class="button" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #52525b; margin: 0 0 16px; font-size: 14px; line-height: 1.6;">
                Atau copy dan paste link berikut ke browser Anda:
              </p>
              
              <p style="margin: 0 0 24px; word-break: break-all;">
                <a href="${resetLink}" style="color: #2563eb; font-size: 14px; text-decoration: underline;">${resetLink}</a>
              </p>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.5;">
                  <strong>Perhatian:</strong> Link ini akan kadaluarsa dalam 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.
                </p>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
              
              <p style="color: #71717a; margin: 0; font-size: 14px; line-height: 1.6;">
                Jika Anda mengalami masalah, silakan hubungi tim support kami.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; text-align: center; background-color: #fafafa; border-radius: 0 0 16px 16px;">
              <p style="color: #a1a1aa; margin: 0 0 8px; font-size: 12px;">
                Email ini dikirim oleh ${appName}
              </p>
              <p style="color: #a1a1aa; margin: 0; font-size: 12px;">
                <a href="${appUrl}" style="color: #71717a; text-decoration: underline;">${appUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const emailText = `
Halo, ${name}!

Kami menerima permintaan untuk mereset password akun Anda.

Silakan klik link berikut untuk membuat password baru:
${resetLink}

Link ini akan kadaluarsa dalam 1 jam.

Jika Anda tidak meminta reset password, abaikan email ini.

---
${appName}
${appUrl}
  `

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || appName}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `Reset Password - ${appName}`,
    text: emailText,
    html: emailHtml,
  })
}
