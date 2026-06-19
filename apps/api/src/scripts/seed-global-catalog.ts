import "dotenv/config";
import { runMassCatalogSeed, MASS_CATALOG_DATA } from "../lib/mass-catalog-seed";
import { prisma } from "../lib/prisma";

async function main() {
  console.log(
    JSON.stringify({
      event: "catalog_seed_start",
      rows: MASS_CATALOG_DATA.length,
      mode: "mass-hyper-scale",
      timestamp: new Date().toISOString(),
    }),
  );

  const result = await runMassCatalogSeed(MASS_CATALOG_DATA, (progress) => {
    process.stdout.write(
      JSON.stringify({
        event: "chunk_progress",
        chunk: progress.chunk,
        totalChunks: progress.totalChunks,
        processed: progress.processed,
        total: progress.total,
        created: progress.created,
        sector: progress.sector,
      }) + "\n",
    );
  });

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
