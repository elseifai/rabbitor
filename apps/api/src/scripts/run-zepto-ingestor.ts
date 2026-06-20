import "dotenv/config";
import { runZeptoIngestor, ZEPTO_CATALOG_DATA } from "../lib/zepto-ingestor";
import { prisma } from "../lib/prisma";

async function main() {
  console.log(
    JSON.stringify({
      event: "zepto_ingestor_start",
      rows: ZEPTO_CATALOG_DATA.length,
      mode: "zepto-fallback-with-live-scrape-attempt",
      timestamp: new Date().toISOString(),
    }),
  );

  const result = await runZeptoIngestor({
    downloadImages: true,
    onProgress: (p) => {
      process.stdout.write(
        JSON.stringify({
          event: "item_progress",
          processed: p.processed,
          total: p.total,
          name: p.name,
          action: p.action,
        }) + "\n",
      );
    },
  });

  console.log(
    JSON.stringify({
      event: "zepto_ingestor_complete",
      source: result.source,
      total: result.total,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      imagesSaved: result.imagesSaved,
      imagesFailed: result.imagesFailed,
      bySector: result.bySector,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    }),
  );

  if (result.errors.length > 0) {
    console.error("Ingestor completed with errors:", result.errors.join("; "));
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(
      JSON.stringify({
        event: "zepto_ingestor_failed",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
