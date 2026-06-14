'use server'

import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

export type OnboardingStatus = {
  complete: boolean
  nextPath: string | null
  merchantHasShop: boolean
  riderHasProfile: boolean
  riderIsVerified: boolean
}

export async function getOnboardingStatusAction(): Promise<OnboardingStatus | null> {
  try {
    const session = await requireSession(['CUSTOMER', 'VENDOR', 'RABBITOR', 'ADMIN'])

    if (session.role === 'CUSTOMER' || session.role === 'ADMIN') {
      return {
        complete: true,
        nextPath: null,
        merchantHasShop: false,
        riderHasProfile: false,
        riderIsVerified: false,
      }
    }

    if (session.role === 'VENDOR') {
      const shop = await prisma.shop.findFirst({
        where: { ownerId: session.userId },
        select: { id: true },
      })
      const complete = Boolean(shop)
      return {
        complete,
        nextPath: complete ? null : '/merchant/onboarding',
        merchantHasShop: complete,
        riderHasProfile: false,
        riderIsVerified: false,
      }
    }

    const profile = await prisma.rabbitorProfile.findUnique({
      where: { userId: session.userId },
      select: { id: true, isVerified: true },
    })

    const complete = Boolean(profile)
    return {
      complete,
      nextPath: complete ? null : '/delivery/login?setup=1',
      merchantHasShop: false,
      riderHasProfile: Boolean(profile),
      riderIsVerified: profile?.isVerified ?? false,
    }
  } catch {
    return null
  }
}
