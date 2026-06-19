import "dotenv/config";
import { runGlobalCatalogSeed, MASTER_INVENTORY_DATA } from "../lib/global-catalog-seed";
import { prisma } from "../lib/prisma";

async function main() {
  console.log(
    JSON.stringify({
      event: "catalog_seed_start",
      rows: MASTER_INVENTORY_DATA.length,
      timestamp: new Date().toISOString(),
    }),
  );

  const result = await runGlobalCatalogSeed();

  console.log(
    JSON.stringify({
      event: "catalog_seed_complete",
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      bySector: result.bySector,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    }),
  );

  if (result.errors.length) {
    console.error("Seed completed with errors:", result.errors.join("; "));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: "catalog_seed_failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
