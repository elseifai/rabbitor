import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import {
  getMerchantLayoutConfig,
  getRiderLayoutConfig,
  updateLayoutConfigs,
} from '@/lib/platform-settings'

/** GET /api/admin/layout-config */
export async function GET() {
  try {
    await requireSession(['ADMIN'])
    const [merchantLayoutConfig, riderLayoutConfig] = await Promise.all([
      getMerchantLayoutConfig(),
      getRiderLayoutConfig(),
    ])
    return NextResponse.json({ success: true, data: { merchantLayoutConfig, riderLayoutConfig } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Access denied'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }
}

/** PUT /api/admin/layout-config */
export async function PUT(request: Request) {
  try {
    await requireSession(['ADMIN'])
    const body = (await request.json()) as {
      merchantLayoutConfig?: Parameters<typeof updateLayoutConfigs>[0]['merchantLayoutConfig']
      riderLayoutConfig?: Parameters<typeof updateLayoutConfigs>[0]['riderLayoutConfig']
    }
    const data = await updateLayoutConfigs(body)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update layout config'
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }
}
