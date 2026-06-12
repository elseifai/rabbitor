import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/auth'

type VerifyBody = {
  phone?: string
  otp?: string
  code?: string
}

/** POST /api/auth/verify — phone OTP verification. DEV ONLY BYPASS for OTP `123456`. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyBody
    const phone = body.phone?.trim()
    const code = (body.otp ?? body.code)?.trim()

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { success: false, error: 'phone is required' },
        { status: 400 },
      )
    }
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'otp must be a 6-digit code' },
        { status: 400 },
      )
    }

    const result = await verifyOtp(phone, code)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Verification failed' },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      user: result.user,
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 400 },
    )
  }
}
