import { NextResponse } from 'next/server'
import { StoreType } from '@rabbit/database'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMerchantStore, type CreateStoreInput } from '@/lib/create-store'

const STORE_TYPES = new Set<string>(Object.values(StoreType))

function parseCreateStoreBody(raw: unknown): CreateStoreInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid request body')
  }
  const body = raw as Record<string, unknown>

  const name = String(body.name ?? '').trim()
  if (!name) throw new Error('Shop name is required')

  const storeType = String(body.storeType ?? '')
  if (!STORE_TYPES.has(storeType)) throw new Error('Invalid store type')

  const address = String(body.address ?? '').trim()
  if (!address) throw new Error('Address is required')

  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Valid coordinates are required')
  }

  const deliveryRadiusKm =
    body.deliveryRadiusKm != null ? Number(body.deliveryRadiusKm) : undefined
  const minOrderValue = body.minOrderValue != null ? Number(body.minOrderValue) : undefined
  const deliveryFee = body.deliveryFee != null ? Number(body.deliveryFee) : undefined

  return {
    name,
    storeType: storeType as StoreType,
    category: body.category != null ? String(body.category).trim() : undefined,
    address,
    description: body.description != null ? String(body.description).trim() : undefined,
    latitude,
    longitude,
    deliveryRadiusKm: Number.isFinite(deliveryRadiusKm) ? deliveryRadiusKm : undefined,
    minOrderValue: Number.isFinite(minOrderValue) ? minOrderValue : undefined,
    deliveryFee: Number.isFinite(deliveryFee) ? deliveryFee : undefined,
    openingHours:
      body.openingHours && typeof body.openingHours === 'object'
        ? (body.openingHours as CreateStoreInput['openingHours'])
        : undefined,
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in to continue' }, { status: 401 })
    }

    if (session.role !== 'VENDOR' && session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Vendor access required' }, { status: 403 })
    }

    const body = parseCreateStoreBody(await request.json())

    const existing = await prisma.shop.findFirst({
      where: { ownerId: session.userId },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'You already have a store — open your merchant dashboard' },
        { status: 409 },
      )
    }

    const shop = await createMerchantStore(session.userId, body)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: shop.id,
          name: shop.name,
          storeType: shop.storeType,
          latitude: shop.latitude,
          longitude: shop.longitude,
          isOpen: shop.isActive,
          minOrderValue: shop.minOrderValue,
          deliveryFee: shop.baseDeliveryFee,
          deliveryRadiusKm: shop.deliveryRadiusKm,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not create store — please try again'
    const status = /required|invalid/i.test(message) ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
