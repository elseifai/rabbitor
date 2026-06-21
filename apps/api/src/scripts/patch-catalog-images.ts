/**
 * Patches all MasterCatalogItem records that have broken /media/catalog/ image URLs
 * (or no image) with correct Unsplash CDN URLs from the catalog-images map.
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { resolveProductImage, PRODUCT_IMAGE_OVERRIDES, CATEGORY_FALLBACK_IMAGES, SECTOR_FALLBACK_IMAGES } from "../lib/catalog-images";

const STORE_TYPE_TO_SECTOR: Record<string, string> = {
  KIRANA: "kirana",
  DAIRY: "dairy",
  BAKERY: "bakery",
  VEGETABLE: "veggies",
  FISH: "fish",
  GENERAL: "kirana",
  RESTAURANT: "kirana",
};

async function main() {
  const items = await prisma.masterCatalogItem.findMany({
    select: { id: true, name: true, imageUrl: true, segmentSlug: true, storeType: true, sku: true },
  });

  console.log(JSON.stringify({ event: "patch_start", total: items.length }));

  let patched = 0;
  let skipped = 0;

  for (const item of items) {
    const isBroken =
      !item.imageUrl ||
      item.imageUrl.startsWith("/media/catalog/") ||
      item.imageUrl === "";

    if (!isBroken) {
      skipped++;
      continue;
    }

    const sector = STORE_TYPE_TO_SECTOR[item.storeType] ?? "kirana";

    // Try to derive the original filename from the SKU
    // SKU format: GC-{SECTOR}-{NAME-SLUG}
    const skuSlug = item.sku?.replace(/^GC-[A-Z]+-/, "").toLowerCase().replace(/-/g, "-") ?? "";
    const guessedFilename = `${skuSlug}.jpg`;

    let imageUrl = resolveProductImage(guessedFilename, item.segmentSlug, sector);

    // If still category fallback, try product name-based lookup
    const isFallback = Object.values(CATEGORY_FALLBACK_IMAGES).includes(imageUrl) ||
      Object.values(SECTOR_FALLBACK_IMAGES).includes(imageUrl);

    if (isFallback) {
      // Try normalising the product name to a filename
      const nameSlug = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) + ".jpg";
      const fromName = resolveProductImage(nameSlug, item.segmentSlug, sector);
      if (fromName !== imageUrl) imageUrl = fromName;
    }

    await prisma.masterCatalogItem.update({
      where: { id: item.id },
      data: { imageUrl },
    });
    patched++;
  }

  console.log(JSON.stringify({ event: "patch_complete", patched, skipped, total: items.length }));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ event: "patch_failed", error: String(err) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
