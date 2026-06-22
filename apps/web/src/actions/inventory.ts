'use server'

import { revalidatePath } from 'next/cache'
import type { StockAdjustmentType } from '@rabbit/database'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'

const INVENTORY_PATHS = ['/merchant/inventory', '/merchant/products', '/merchant', '/shops']

function revalidateInventory() {
  for (const path of INVENTORY_PATHS) revalidatePath(path)
}

async function ownedShop(userId: string) {
  return prisma.shop.findFirst({
    where: { ownerId: userId },
    select: { id: true, name: true, slug: true },
  })
}

async function ownedProduct(productId: string, userId: string) {
  return prisma.product.findFirst({
    where: { id: productId, shop: { ownerId: userId } },
    include: {
      shop: { select: { slug: true } },
      variants: { orderBy: { createdAt: 'asc' } },
    },
  })
}

export type InventoryVariantInput = {
  id?: string
  name: string
  sku?: string
  barcode?: string
  price: number
  mrp?: number
  stock: number
  isAvailable?: boolean
}

export type InventoryProductInput = {
  id?: string
  name: string
  description?: string
  price: number
  mrp?: number
  unit?: string
  stock?: number
  sku?: string
  barcode?: string
  brand?: string
  productCategory?: string
  costPrice?: number
  lowStockThreshold?: number
  taxRate?: number
  hsnCode?: string
  imageUrl?: string
  isAvailable?: boolean
  variants?: InventoryVariantInput[]
}

function effectiveStock(product: {
  stock: number
  variants: { stock: number }[]
}): number {
  if (product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + v.stock, 0)
  }
  return product.stock
}

function isLowStock(
  stock: number,
  threshold: number,
): boolean {
  return stock > 0 && stock <= threshold
}

export async function getInventoryStatsAction() {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await ownedShop(session.userId)
    if (!shop) return null

    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      include: { variants: { select: { stock: true } } },
    })

    let lowStock = 0
    let outOfStock = 0
    let inventoryValue = 0

    for (const p of products) {
      const stock = effectiveStock(p)
      if (stock === 0) outOfStock++
      else if (isLowStock(stock, p.lowStockThreshold)) lowStock++
      inventoryValue += stock * p.price
    }

    const variantCount = await prisma.productVariant.count({
      where: { product: { shopId: shop.id } },
    })

    return {
      shopName: shop.name,
      totalProducts: products.length,
      totalVariants: variantCount,
      lowStock,
      outOfStock,
      inventoryValue: Math.round(inventoryValue),
    }
  } catch {
    return null
  }
}

export async function getInventoryAction(opts?: {
  search?: string
  filter?: 'all' | 'low' | 'out'
}) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await ownedShop(session.userId)
    if (!shop) return null

    const search = opts?.search?.trim()
    const products = await prisma.product.findMany({
      where: {
        shopId: shop.id,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { sku: { contains: search, mode: 'insensitive' as const } },
                { barcode: { contains: search, mode: 'insensitive' as const } },
                { brand: { contains: search, mode: 'insensitive' as const } },
                {
                  variants: {
                    some: {
                      OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { sku: { contains: search, mode: 'insensitive' as const } },
                        { barcode: { contains: search, mode: 'insensitive' as const } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const filter = opts?.filter ?? 'all'
    const mapped = products.map((p) => {
      const stock = effectiveStock(p)
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        mrp: p.mrp,
        unit: p.unit,
        stock,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand,
        productCategory: p.productCategory,
        costPrice: p.costPrice,
        lowStockThreshold: p.lowStockThreshold,
        taxRate: p.taxRate,
        hsnCode: p.hsnCode,
        image: p.image,
        isAvailable: p.isAvailable,
        variantCount: p.variants.length,
        variants: p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock,
          isAvailable: v.isAvailable,
        })),
        stockStatus:
          stock === 0 ? ('out' as const) : isLowStock(stock, p.lowStockThreshold) ? ('low' as const) : ('ok' as const),
      }
    })

    const filtered =
      filter === 'low'
        ? mapped.filter((p) => p.stockStatus === 'low')
        : filter === 'out'
          ? mapped.filter((p) => p.stockStatus === 'out')
          : mapped

    return { shopId: shop.id, shopName: shop.name, products: filtered }
  } catch {
    return null
  }
}

export async function lookupByBarcodeAction(barcode: string) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await ownedShop(session.userId)
    if (!shop) return { ok: false as const, error: 'Shop not found' }

    const code = barcode.trim()
    if (!code) return { ok: false as const, error: 'Enter a barcode' }

    const product = await prisma.product.findFirst({
      where: {
        shopId: shop.id,
        OR: [{ barcode: code }, { variants: { some: { barcode: code } } }],
      },
      include: { variants: { orderBy: { createdAt: 'asc' } } },
    })

    if (!product) return { ok: true as const, found: false as const, barcode: code }

    const matchedVariant = product.variants.find((v) => v.barcode === code)

    return {
      ok: true as const,
      found: true as const,
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        mrp: product.mrp,
        unit: product.unit,
        stock: product.stock,
        sku: product.sku,
        barcode: product.barcode,
        brand: product.brand,
        productCategory: product.productCategory,
        costPrice: product.costPrice,
        lowStockThreshold: product.lowStockThreshold,
        taxRate: product.taxRate,
        hsnCode: product.hsnCode,
        image: product.image,
        isAvailable: product.isAvailable,
        variants: product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          price: v.price,
          mrp: v.mrp,
          stock: v.stock,
          isAvailable: v.isAvailable,
        })),
        matchedVariantId: matchedVariant?.id,
      },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    return { ok: false as const, error: message }
  }
}

async function recordAdjustment(
  input: {
    shopId: string
    productId: string
    variantId?: string
    type: StockAdjustmentType
    quantityBefore: number
    quantityAfter: number
    note?: string
    reference?: string
    createdById?: string
  },
  tx: Pick<typeof prisma, 'stockAdjustment'> = prisma,
) {
  await tx.stockAdjustment.create({
    data: {
      shopId: input.shopId,
      productId: input.productId,
      variantId: input.variantId,
      type: input.type,
      quantityDelta: input.quantityAfter - input.quantityBefore,
      quantityBefore: input.quantityBefore,
      quantityAfter: input.quantityAfter,
      note: input.note,
      reference: input.reference,
      createdById: input.createdById,
    },
  })
}

export async function saveInventoryProductAction(input: InventoryProductInput) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const shop = await ownedShop(session.userId)
    if (!shop) return { ok: false as const, error: 'Shop not found' }

    if (!input.name.trim()) return { ok: false as const, error: 'Product name is required' }
    if (!Number.isFinite(input.price) || input.price <= 0) {
      return { ok: false as const, error: 'Enter a valid selling price' }
    }

    const variants = input.variants?.filter((v) => v.name.trim()) ?? []
    const hasVariants = variants.length > 0

    if (input.id) {
      const existing = await ownedProduct(input.id, session.userId)
      if (!existing) return { ok: false as const, error: 'Product not found' }

      await prisma.$transaction(async (tx) => {
        const beforeStock = existing.stock
        const newStock = hasVariants ? 0 : Math.max(0, input.stock ?? existing.stock)

        await tx.product.update({
          where: { id: input.id },
          data: {
            name: input.name.trim(),
            description: input.description?.trim() || null,
            price: input.price,
            mrp: input.mrp ?? null,
            unit: input.unit?.trim() || 'piece',
            stock: newStock,
            sku: input.sku?.trim() || null,
            barcode: input.barcode?.trim() || null,
            brand: input.brand?.trim() || null,
            productCategory: input.productCategory?.trim() || null,
            costPrice: input.costPrice ?? null,
            lowStockThreshold: input.lowStockThreshold ?? existing.lowStockThreshold,
            taxRate: input.taxRate ?? null,
            hsnCode: input.hsnCode?.trim() || null,
            image: input.imageUrl ?? existing.image,
            isAvailable: input.isAvailable ?? existing.isAvailable,
          },
        })

        const existingVariantIds = existing.variants.map((v) => v.id)
        const incomingIds = variants.filter((v) => v.id).map((v) => v.id!)
        const toDelete = existingVariantIds.filter((id) => !incomingIds.includes(id))
        if (toDelete.length) {
          await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } })
        }

        for (const v of variants) {
          if (v.id) {
            const prev = existing.variants.find((x) => x.id === v.id)
            await tx.productVariant.update({
              where: { id: v.id },
              data: {
                name: v.name.trim(),
                sku: v.sku?.trim() || null,
                barcode: v.barcode?.trim() || null,
                price: v.price,
                mrp: v.mrp ?? null,
                stock: Math.max(0, v.stock),
                isAvailable: v.isAvailable ?? true,
              },
            })
            if (prev && prev.stock !== v.stock) {
              await recordAdjustment(
                {
                  shopId: shop.id,
                  productId: input.id!,
                  variantId: v.id,
                  type: 'CORRECTION',
                  quantityBefore: prev.stock,
                  quantityAfter: Math.max(0, v.stock),
                  note: 'Stock updated via inventory editor',
                  createdById: session.userId,
                },
                tx,
              )
            }
          } else {
            const created = await tx.productVariant.create({
              data: {
                productId: input.id!,
                name: v.name.trim(),
                sku: v.sku?.trim() || null,
                barcode: v.barcode?.trim() || null,
                price: v.price,
                mrp: v.mrp ?? null,
                stock: Math.max(0, v.stock),
                isAvailable: v.isAvailable ?? true,
              },
            })
            if (created.stock > 0) {
              await recordAdjustment(
                {
                  shopId: shop.id,
                  productId: input.id!,
                  variantId: created.id,
                  type: 'INITIAL',
                  quantityBefore: 0,
                  quantityAfter: created.stock,
                  note: 'Variant added',
                  createdById: session.userId,
                },
                tx,
              )
            }
          }
        }

        if (!hasVariants && beforeStock !== newStock) {
          await recordAdjustment(
            {
              shopId: shop.id,
              productId: input.id!,
              type: 'CORRECTION',
              quantityBefore: beforeStock,
              quantityAfter: newStock,
              note: 'Stock updated via inventory editor',
              createdById: session.userId,
            },
            tx,
          )
        }
      })

      revalidateInventory()
      revalidatePath(`/shops/${existing.shop.slug}`)
      return { ok: true as const, productId: input.id }
    }

    const stock = hasVariants ? 0 : Math.max(0, input.stock ?? 0)
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          shopId: shop.id,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          price: input.price,
          mrp: input.mrp ?? null,
          unit: input.unit?.trim() || 'piece',
          stock,
          sku: input.sku?.trim() || null,
          barcode: input.barcode?.trim() || null,
          brand: input.brand?.trim() || null,
          productCategory: input.productCategory?.trim() || null,
          costPrice: input.costPrice ?? null,
          lowStockThreshold: input.lowStockThreshold ?? 5,
          taxRate: input.taxRate ?? null,
          hsnCode: input.hsnCode?.trim() || null,
          image: input.imageUrl,
          isAvailable: input.isAvailable ?? true,
        },
      })

      if (stock > 0) {
        await recordAdjustment(
          {
            shopId: shop.id,
            productId: created.id,
            type: 'INITIAL',
            quantityBefore: 0,
            quantityAfter: stock,
            note: 'Initial stock',
            reference: input.barcode,
            createdById: session.userId,
          },
          tx,
        )
      }

      for (const v of variants) {
        const variant = await tx.productVariant.create({
          data: {
            productId: created.id,
            name: v.name.trim(),
            sku: v.sku?.trim() || null,
            barcode: v.barcode?.trim() || null,
            price: v.price,
            mrp: v.mrp ?? null,
            stock: Math.max(0, v.stock),
            isAvailable: v.isAvailable ?? true,
          },
        })
        if (variant.stock > 0) {
          await recordAdjustment(
            {
              shopId: shop.id,
              productId: created.id,
              variantId: variant.id,
              type: 'INITIAL',
              quantityBefore: 0,
              quantityAfter: variant.stock,
              note: 'Initial variant stock',
              createdById: session.userId,
            },
            tx,
          )
        }
      }

      return created
    })

    revalidateInventory()
    revalidatePath(`/shops/${shop.slug}`)
    return { ok: true as const, productId: product.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save product'
    if (message.includes('Unique constraint')) {
      return { ok: false as const, error: 'SKU or barcode already used in your shop' }
    }
    return { ok: false as const, error: message }
  }
}

export async function adjustStockAction(input: {
  productId: string
  variantId?: string
  delta: number
  type: StockAdjustmentType
  note?: string
  reference?: string
}) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const product = await ownedProduct(input.productId, session.userId)
    if (!product) return { ok: false as const, error: 'Product not found' }

    if (input.variantId) {
      const variant = product.variants.find((v) => v.id === input.variantId)
      if (!variant) return { ok: false as const, error: 'Variant not found' }
      const before = variant.stock
      const after = Math.max(0, before + input.delta)
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { stock: after },
      })
      await recordAdjustment({
        shopId: product.shopId,
        productId: product.id,
        variantId: variant.id,
        type: input.type,
        quantityBefore: before,
        quantityAfter: after,
        note: input.note,
        reference: input.reference,
        createdById: session.userId,
      })
    } else {
      const before = product.stock
      const after = Math.max(0, before + input.delta)
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: after },
      })
      await recordAdjustment({
        shopId: product.shopId,
        productId: product.id,
        type: input.type,
        quantityBefore: before,
        quantityAfter: after,
        note: input.note,
        reference: input.reference,
        createdById: session.userId,
      })
    }

    revalidateInventory()
    revalidatePath(`/shops/${product.shop.slug}`)
    return { ok: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stock adjustment failed'
    return { ok: false as const, error: message }
  }
}

export async function deleteInventoryProductAction(productId: string) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const product = await ownedProduct(productId, session.userId)
    if (!product) return { ok: false as const, error: 'Product not found' }

    await prisma.product.delete({ where: { id: productId } })
    revalidateInventory()
    revalidatePath(`/shops/${product.shop.slug}`)
    return { ok: true as const }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete product'
    return { ok: false as const, error: message }
  }
}

export async function getStockHistoryAction(productId: string, variantId?: string) {
  try {
    const session = await requireSession(['VENDOR', 'ADMIN'])
    const product = await ownedProduct(productId, session.userId)
    if (!product) return null

    return prisma.stockAdjustment.findMany({
      where: {
        productId,
        ...(variantId ? { variantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        quantityDelta: true,
        quantityBefore: true,
        quantityAfter: true,
        note: true,
        reference: true,
        createdAt: true,
      },
    })
  } catch {
    return null
  }
}
