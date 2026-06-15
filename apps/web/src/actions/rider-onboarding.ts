'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import type { RiderVehicleType } from '@rabbit/database'

export type RiderProfileForm = {
  fullName: string
  contactPhone: string
  emergencyPhone: string
  vehicleType: RiderVehicleType
  vehiclePlate: string
  drivingLicenseId: string
  bankName: string
  bankAccountNumber: string
  ifscCode: string
}

export type RiderProfileStatus = {
  isOnboarded: boolean
  profile: Partial<RiderProfileForm> | null
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return digits
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  throw new Error('Enter a valid 10-digit mobile number')
}

export async function getRiderProfileStatusAction(): Promise<
  { ok: true; status: RiderProfileStatus } | { ok: false; error: string }
> {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])
    const profile = await prisma.rabbitorProfile.findUnique({
      where: { userId: session.userId },
    })

    if (!profile) {
      return {
        ok: true,
        status: { isOnboarded: false, profile: null },
      }
    }

    return {
      ok: true,
      status: {
        isOnboarded: profile.isOnboarded,
        profile: {
          fullName: profile.fullName ?? undefined,
          contactPhone: profile.contactPhone ?? undefined,
          emergencyPhone: profile.emergencyPhone ?? undefined,
          vehicleType: profile.vehicleType ?? undefined,
          vehiclePlate: profile.vehiclePlate ?? undefined,
          drivingLicenseId: profile.drivingLicenseId ?? undefined,
          bankName: profile.bankName ?? undefined,
          bankAccountNumber: profile.bankAccountNumber ?? undefined,
          ifscCode: profile.ifscCode ?? undefined,
        },
      },
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function submitRiderOnboardingAction(
  form: RiderProfileForm,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireSession(['RABBITOR', 'ADMIN'])

    const fullName = form.fullName.trim()
    if (fullName.length < 2) return { ok: false, error: 'Enter your full name.' }

    const contactPhone = normalizePhone(form.contactPhone)
    const emergencyPhone = normalizePhone(form.emergencyPhone)
    const vehiclePlate = form.vehiclePlate.trim().toUpperCase()
    const drivingLicenseId = form.drivingLicenseId.trim().toUpperCase()
    const bankName = form.bankName.trim()
    const bankAccountNumber = form.bankAccountNumber.replace(/\D/g, '')
    const ifscCode = form.ifscCode.trim().toUpperCase()

    if (!vehiclePlate) return { ok: false, error: 'Enter your vehicle registration number.' }
    if (!drivingLicenseId) return { ok: false, error: 'Enter your driving license ID.' }
    if (!bankName) return { ok: false, error: 'Enter your bank name.' }
    if (bankAccountNumber.length < 8) return { ok: false, error: 'Enter a valid account number.' }
    if (!/^[\dA-Z]{11}$/.test(ifscCode)) return { ok: false, error: 'Enter a valid 11-character IFSC code.' }

    await prisma.$transaction([
      prisma.rabbitorProfile.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          fullName,
          contactPhone,
          emergencyPhone,
          vehicleType: form.vehicleType,
          vehiclePlate,
          drivingLicenseId,
          bankName,
          bankAccountNumber,
          ifscCode,
          isOnboarded: true,
        },
        update: {
          fullName,
          contactPhone,
          emergencyPhone,
          vehicleType: form.vehicleType,
          vehiclePlate,
          drivingLicenseId,
          bankName,
          bankAccountNumber,
          ifscCode,
          isOnboarded: true,
        },
      }),
      prisma.user.update({
        where: { id: session.userId },
        data: {
          name: fullName,
          phone: contactPhone,
        },
      }),
    ])

    revalidatePath('/delivery/login')
    revalidatePath('/delivery/dashboard')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function requestRiderPayoutAction(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  try {
    await requireSession(['RABBITOR', 'ADMIN'])
    return {
      ok: true,
      message: 'Payout request received. Funds will arrive within 24–48 hours.',
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

export async function getRiderEarningsAction() {
  const session = await requireSession(['RABBITOR', 'ADMIN'])
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const delivered = await prisma.order.findMany({
    where: {
      deliveryPartnerId: session.userId,
      status: 'DELIVERED',
    },
    select: {
      id: true,
      orderNumber: true,
      deliveryFee: true,
      riderTip: true,
      deliveredAt: true,
      shop: { select: { name: true } },
    },
    orderBy: { deliveredAt: 'desc' },
    take: 50,
  })

  const today = delivered.filter((o) => o.deliveredAt && o.deliveredAt >= startOfDay)
  const sum = (rows: typeof delivered) =>
    rows.reduce((acc, o) => acc + o.deliveryFee + o.riderTip, 0)

  return {
    todayTotal: sum(today),
    todayTrips: today.length,
    weekTotal: sum(delivered),
    weekTrips: delivered.length,
    recent: delivered.slice(0, 8).map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      shopName: o.shop.name,
      amount: o.deliveryFee + o.riderTip,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
    })),
  }
}
