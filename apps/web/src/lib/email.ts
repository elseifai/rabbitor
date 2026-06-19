import nodemailer from 'nodemailer'

interface SendEmailArgs {
  to: string
  subject: string
  html: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function isBypassEnabled(): boolean {
  return (
    process.env.ALLOW_DEV_OTP_BYPASS === 'true' || process.env.NODE_ENV !== 'production'
  )
}

async function sendViaResend(
  apiKey: string,
  from: string,
  { to, subject, html }: SendEmailArgs,
): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Email send failed (${res.status}): ${detail}`)
  }
}

async function sendViaSmtp(
  { to, subject, html }: SendEmailArgs,
  from: string,
): Promise<void> {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) {
    throw new Error('SMTP credentials missing')
  }

  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT ?? 587)

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  await transport.sendMail({
    from,
    to,
    subject,
    html,
  })
}

/**
 * Sends transactional email via Resend (preferred) or SMTP (Gmail etc.).
 * In dev bypass mode, logs instead of sending when no provider is configured.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  const smtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
  const from =
    process.env.EMAIL_FROM ??
    (process.env.SMTP_USER ? `Rabbit <${process.env.SMTP_USER}>` : 'Rabbit <onboarding@resend.dev>')

  if (resendKey) {
    await sendViaResend(resendKey, from, { to, subject, html })
    return
  }

  if (smtpConfigured) {
    await sendViaSmtp({ to, subject, html }, from)
    return
  }

  const msg = 'Email service is not configured (set RESEND_API_KEY or SMTP_USER/SMTP_PASS)'
  if (isBypassEnabled()) {
    console.warn(`[EMAIL] ${msg} — bypass enabled; OTP for ${to}: check server logs / dev UI`)
    return
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  }

  console.warn(`[EMAIL] No email provider — would send to ${to}: ${subject}`)
}

export function verificationEmailHtml(code: string, link: string): string {
  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h1 style="color:#FF6B35;font-size:22px;margin:0 0 8px">Rabbit</h1>
    <p style="font-size:15px;color:#333">Use this code to sign in:</p>
    <p style="font-size:34px;font-weight:800;letter-spacing:8px;color:#111;margin:12px 0">${code}</p>
    <p style="font-size:14px;color:#555">Or tap the button below — it expires in 10 minutes.</p>
    <p style="margin:20px 0">
      <a href="${link}" style="background:#FF6B35;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:15px">Verify &amp; continue</a>
    </p>
    <p style="font-size:12px;color:#999">If you didn't request this, you can ignore this email.</p>
  </div>`
}
