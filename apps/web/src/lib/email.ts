interface SendEmailArgs {
  to: string
  subject: string
  html: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/**
 * Sends a transactional email via Resend when RESEND_API_KEY is set.
 * In dev (or when unconfigured) it logs to the server console so the flow
 * still works without credentials.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Rabbit <onboarding@resend.dev>'
  const bypass =
    process.env.ALLOW_DEV_OTP_BYPASS === 'true' ||
    process.env.NODE_ENV !== 'production'

  if (!apiKey) {
    const msg = 'Email service is not configured (RESEND_API_KEY missing)'
    if (bypass) {
      console.warn(`[EMAIL] ${msg} — bypass enabled; OTP for ${to}: check server logs / dev UI`)
      return
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    }
    console.warn(`[EMAIL] RESEND_API_KEY not set — would send to ${to}: ${subject}`)
    return
  }

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
