import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { runMassCatalogSeed, MASS_CATALOG_DATA } from "../lib/mass-catalog-seed";
import { runGlobalCatalogSeed, MASTER_INVENTORY_DATA, mapSeedRowToMasterCatalog, generateCatalogSku } from "../lib/global-catalog-seed";
import type { MerchantCatalogSeedRow } from "../lib/global-catalog-seed";
import type { StoreType, CatalogItemType } from "@rabbit/database";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/catalog
// Returns paginated catalog with computed velocity + feedback metrics
// ─────────────────────────────────────────────────────────────────────────────
export async function getCatalogItems(req: Request, res: Response) {
  const { q = "", storeType, limit = "200", offset = "0" } = req.query as Record<string, string>;

  const items = await prisma.masterCatalogItem.findMany({
    where: {
      isActive: true,
      ...(q && {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      }),
      ...(storeType && { storeType: storeType as StoreType }),
    },
    take: Math.min(Number(limit), 500),
    skip: Number(offset),
    orderBy: { name: "asc" },
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
      itemType: true,
      category: true,
      subcategory: true,
      basePrice: true,
      imageUrl: true,
      storeType: true,
      shopProducts: {
        select: {
          orderItems: {
            select: { quantity: true, price: true },
          },
        },
        take: 200,
      },
    },
  });

  let maxOrders = 0;
  const rawItems = items.map((item) => {
    const lifetimeOrdersCount = item.shopProducts.reduce(
      (sum, p) => sum + p.orderItems.length,
      0,
    );
    const lifetimeRevenue = item.shopProducts.reduce(
      (sum, p) => sum + p.orderItems.reduce((s, oi) => s + oi.quantity * oi.price, 0),
      0,
    );
    if (lifetimeOrdersCount > maxOrders) maxOrders = lifetimeOrdersCount;
    return { ...item, lifetimeOrdersCount, lifetimeRevenue, shopProducts: undefined };
  });

  maxOrders = maxOrders || 1;

  const enriched = rawItems.map((item, idx) => {
    const ratio = item.lifetimeOrdersCount / maxOrders;
    const velocityBadge =
      ratio >= 0.6 ? "high" : ratio >= 0.25 ? "medium" : ratio >= 0.05 ? "low" : "new";
    const velocityLabel =
      velocityBadge === "high"
        ? `🔥 Top Seller · ${item.lifetimeOrdersCount} orders`
        : velocityBadge === "medium"
          ? `📈 Growing · ${item.lifetimeOrdersCount} orders`
          : velocityBadge === "low"
            ? `🌱 Early · ${item.lifetimeOrdersCount} orders`
            : "🆕 New Template";

    return {
      ...item,
      velocityBadge,
      velocityLabel,
      velocityRank: idx + 1,
      customerFeedbackPositivePercent: 0,
    };
  });

  res.json({ success: true, data: enriched });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/catalog/stats
// Dashboard diagnostics: totals, category volumes, shop mapping counts
// ─────────────────────────────────────────────────────────────────────────────
export async function getCatalogStats(req: Request, res: Response) {
  const [totalItems, categoryGroups, storeTypeGroups, shopMappings] = await Promise.all([
    prisma.masterCatalogItem.count({ where: { isActive: true } }),
    prisma.masterCatalogItem.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
    prisma.masterCatalogItem.groupBy({
      by: ["storeType"],
      where: { isActive: true },
      _count: { id: true },
    }),
    prisma.product.count({ where: { masterCatalogItemId: { not: null } } }),
  ]);

  res.json({
    success: true,
    data: {
      totalItems,
      shopMappings,
      categoryBreakdown: categoryGroups.map((g) => ({
        category: g.category,
        count: g._count.id,
      })),
      storeTypeBreakdown: storeTypeGroups.map((g) => ({
        storeType: g.storeType,
        count: g._count.id,
      })),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/admin/catalog/seed
// Standard JSON seed — 66 items, returns full summary
// ─────────────────────────────────────────────────────────────────────────────
export async function seedCatalog(_req: Request, res: Response) {
  const result = await runGlobalCatalogSeed(MASTER_INVENTORY_DATA);
  res.json({ success: true, data: result });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/admin/catalog/mass-seed
// Mass seed — 500+ items, returns full summary (long-running)
// ─────────────────────────────────────────────────────────────────────────────
export async function massSeedCatalog(_req: Request, res: Response) {
  const result = await runMassCatalogSeed(MASS_CATALOG_DATA);
  res.json({ success: true, data: result });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/admin/catalog/mass-seed/stream
// Server-Sent Events stream — real-time chunk progress during mass seed
// ─────────────────────────────────────────────────────────────────────────────
export async function massSeedCatalogStream(_req: Request, res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send("start", { total: MASS_CATALOG_DATA.length, chunks: Math.ceil(MASS_CATALOG_DATA.length / 25) });

  try {
    const result = await runMassCatalogSeed(MASS_CATALOG_DATA, (progress) => {
      send("progress", progress);
    });

    send("complete", result);
  } catch (err) {
    send("error", { message: err instanceof Error ? err.message : "Seed failed" });
  } finally {
    res.end();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/admin/catalog/upsert
// Bulk upsert stream — accepts array of items, processes with duplicate guard
// ─────────────────────────────────────────────────────────────────────────────
export async function bulkUpsertCatalog(req: Request, res: Response) {
  const { items } = req.body as { items?: unknown[] };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: "items array is required" });
    return;
  }

  const upserted: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const name = String(item.name ?? "").trim();
    const unit = String(item.defaultUnit ?? item.unit ?? "1 unit").trim();

    if (!name) { skipped.push("(unnamed item)"); continue; }

    try {
      const storeType = (item.storeType as StoreType) ?? "KIRANA";
      const sector = storeType.toLowerCase() as MerchantCatalogSeedRow["sector"];
      const sku = generateCatalogSku(name, sector);
      const basePrice = Number(item.basePrice ?? item.price ?? 0);

      await prisma.masterCatalogItem.upsert({
        where: { sku },
        create: {
          sku,
          name,
          storeType,
          category: String(item.category ?? "general"),
          subcategory: item.subcategory ? String(item.subcategory) : null,
          basePrice,
          defaultUnit: unit,
          description: item.description ? String(item.description) : null,
          imageUrl: item.imageUrl ? String(item.imageUrl) : null,
          itemType: (item.itemType as CatalogItemType) ?? "VEG",
          isActive: true,
        },
        update: {
          basePrice,
          defaultUnit: unit,
          description: item.description ? String(item.description) : undefined,
          isActive: true,
        },
      });
      upserted.push(name);
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : "error"}`);
    }
  }

  res.json({ success: true, upserted: upserted.length, skipped: skipped.length, errors });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/admin/catalog/auto-promote
// Auto-promote a custom merchant product into the MasterCatalog
// Used by the cross-pollination hook
// ─────────────────────────────────────────────────────────────────────────────
export async function autoPromoteToCatalog(req: Request, res: Response) {
  const { productId } = req.body as { productId?: string };
  if (!productId) {
    res.status(400).json({ success: false, error: "productId is required" });
    return;
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { shop: { select: { storeType: true } } },
  });

  if (!product) {
    res.status(404).json({ success: false, error: "Product not found" });
    return;
  }

  if (product.masterCatalogItemId) {
    res.json({ success: true, alreadyLinked: true, masterCatalogItemId: product.masterCatalogItemId });
    return;
  }

  const storeType = product.shop.storeType ?? "KIRANA";
  const sector = storeType.toLowerCase() as MerchantCatalogSeedRow["sector"];
  const sku = generateCatalogSku(product.name, sector);

  const existing = await prisma.masterCatalogItem.findFirst({
    where: {
      OR: [
        { sku },
        {
          AND: [
            { name: { equals: product.name, mode: "insensitive" } },
            { storeType },
          ],
        },
      ],
    },
    select: { id: true },
  });

  let catalogItem;
  if (existing) {
    catalogItem = existing;
  } else {
    catalogItem = await prisma.masterCatalogItem.create({
      data: {
        sku,
        name: product.name,
        storeType,
        category: product.category ?? "general",
        subcategory: null,
        basePrice: product.price,
        defaultUnit: product.unit ?? "1 unit",
        description: product.description,
        imageUrl: product.image,
        itemType: "VEG",
        isActive: true,
      },
    });
  }

  await prisma.product.update({
    where: { id: productId },
    data: { masterCatalogItemId: catalogItem.id },
  });

  res.json({ success: true, promoted: !existing, masterCatalogItemId: catalogItem.id });
}
