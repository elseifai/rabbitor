import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { computeAdCtr } from '@/lib/ad-utils'

export async function GET() {
  try {
    await requireSession(['ADMIN'])

    const ads = await prisma.ad.findMany({
      select: {
        impressions: true,
        clicks: true,
        uniqueClicks: true,
        isActive: true,
        startDate: true,
        endDate: true,
      },
    })

    const impressions = ads.reduce((s, a) => s + a.impressions, 0)
    const clicks = ads.reduce((s, a) => s + a.clicks, 0)
    const uniqueClicks = ads.reduce((s, a) => s + a.uniqueClicks, 0)
    const now = Date.now()
    const live = ads.filter((a) => {
      if (!a.isActive) return false
      const end = a.endDate ? new Date(a.endDate).getTime() : null
      if (end != null && end < now) return false
      return new Date(a.startDate).getTime() <= now
    }).length

    return NextResponse.json({
      success: true,
      data: {
        liveCampaigns: live,
        totalImpressions: impressions,
        totalClicks: clicks,
        totalUniqueClicks: uniqueClicks,
        ctr: computeAdCtr(impressions, clicks),
        uniqueCtr: computeAdCtr(impressions, uniqueClicks),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    const code = /log in|access denied/i.test(message) ? 401 : 500
    return NextResponse.json({ success: false, error: message }, { status: code })
  }
}
