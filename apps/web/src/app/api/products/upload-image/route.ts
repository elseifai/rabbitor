import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getApiBaseUrl, mintApiAccessToken } from '@/lib/api-jwt'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const token = await mintApiAccessToken(session.userId)

    const response = await fetch(`${getApiBaseUrl()}/api/v1/products/upload-image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok || json.success === false) {
      const err = json.error
      const message =
        typeof err === 'string'
          ? err
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: string }).message)
            : 'Upload failed'
      return NextResponse.json({ success: false, error: message }, { status: response.status })
    }

    return NextResponse.json({ success: true, data: json.data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
