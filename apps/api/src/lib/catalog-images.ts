/**
 * Curated Unsplash image map for Indian catalog products.
 * Images are sourced from Unsplash public CDN — stable, free, no API key needed.
 * Each URL uses `?w=400&h=400&fit=crop&auto=format` for consistent square thumbnails.
 */

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&auto=format&q=80`;

// ─── Per-product image overrides (keyed by filename or product SKU slug) ─────
export const PRODUCT_IMAGE_OVERRIDES: Record<string, string> = {
  // ── Flours & Atta ──
  "aashirvaad-atta.jpg":       U("1574323347407-f5e1ad6d020b"),
  "aashirvaad-multigrain.jpg": U("1574323347407-f5e1ad6d020b"),
  "aashirvaad-sfc.jpg":        U("1574323347407-f5e1ad6d020b"),
  "rajdhani-atta.jpg":         U("1574323347407-f5e1ad6d020b"),

  // ── Rice & Grains ──
  "kohinoor-rice.jpg":         U("1536304929831-ee1ca9d44906"),
  "daawat-rice.jpg":           U("1536304929831-ee1ca9d44906"),
  "india-gate-rice.jpg":       U("1536304929831-ee1ca9d44906"),

  // ── Salt ──
  "tata-salt.jpg":             U("1518110925495-5fe2fda0442a"),
  "tata-salt-lite.jpg":        U("1518110925495-5fe2fda0442a"),
  "catch-salt.jpg":            U("1518110925495-5fe2fda0442a"),

  // ── Oils ──
  "fortune-oil.jpg":           U("1474979266404-7eaacbcd87c5"),
  "fortune-soya.jpg":          U("1474979266404-7eaacbcd87c5"),
  "dhara-oil.jpg":             U("1474979266404-7eaacbcd87c5"),
  "saffola-oil.jpg":           U("1474979266404-7eaacbcd87c5"),

  // ── Oats ──
  "saffola-oats.jpg":          U("1593491034932-844af9e27e3c"),
  "quaker-oats.jpg":           U("1593491034932-844af9e27e3c"),

  // ── Pulses & Dal ──
  "toor-dal.jpg":              U("1589301760014-d929f3979dbc"),
  "moong-dal.jpg":             U("1589301760014-d929f3979dbc"),
  "masoor-dal.jpg":            U("1601050690597-df0568f70950"),
  "chana-dal.jpg":             U("1589301760014-d929f3979dbc"),
  "urad-dal.jpg":              U("1589301760014-d929f3979dbc"),
  "rajma.jpg":                 U("1547592166-23ac45744acd"),
  "chhole.jpg":                U("1631452180775-17f56e5cdeb5"),

  // ── Noodles & Instant ──
  "maggi.jpg":                 U("1612929633738-8fe44f7ec841"),
  "maggi-atta.jpg":            U("1612929633738-8fe44f7ec841"),
  "maggi-4pack.jpg":           U("1612929633738-8fe44f7ec841"),
  "knorr-noodles.jpg":         U("1612929633738-8fe44f7ec841"),
  "chings-noodles.jpg":        U("1612929633738-8fe44f7ec841"),
  "yippee.jpg":                U("1612929633738-8fe44f7ec841"),
  "top-ramen.jpg":             U("1612929633738-8fe44f7ec841"),

  // ── Spices ──
  "mdh-garam.jpg":             U("1596040033229-a9821ebd058d"),
  "mdh-chana.jpg":             U("1596040033229-a9821ebd058d"),
  "mdh-rajma.jpg":             U("1596040033229-a9821ebd058d"),
  "mdh-kitchen-king.jpg":      U("1596040033229-a9821ebd058d"),
  "mdh-garam-masala.jpg":      U("1596040033229-a9821ebd058d"),
  "everest-chilli.jpg":        U("1605050800889-d39e56b09d7a"),
  "everest-garam.jpg":         U("1596040033229-a9821ebd058d"),
  "catch-turmeric.jpg":        U("1615485290382-441e4aa8a561"),
  "catch-coriander.jpg":       U("1596040033229-a9821ebd058d"),
  "tata-cumin.jpg":            U("1596040033229-a9821ebd058d"),

  // ── Condiments ──
  "kissan-ketchup.jpg":        U("1561181286-d3f19c8b7b6c"),
  "maggi-sauce.jpg":           U("1561181286-d3f19c8b7b6c"),
  "chings-soy.jpg":            U("1569050467447-ce54b3bbc37d"),
  "knorr-sauce.jpg":           U("1561181286-d3f19c8b7b6c"),

  // ── Biscuits ──
  "parle-g.jpg":               U("1558961363-fa8fdf82db35"),
  "krackjack.jpg":             U("1558961363-fa8fdf82db35"),
  "hide-seek.jpg":             U("1558961363-fa8fdf82db35"),
  "parle-cashew.jpg":          U("1558961363-fa8fdf82db35"),
  "goodday.jpg":               U("1558961363-fa8fdf82db35"),
  "marie-gold.jpg":            U("1558961363-fa8fdf82db35"),
  "nutrichoice.jpg":           U("1558961363-fa8fdf82db35"),
  "dark-fantasy.jpg":          U("1578985545062-bc5f6f90ded8"),
  "moms-magic.jpg":            U("1558961363-fa8fdf82db35"),

  // ── Snacks ──
  "lays.jpg":                  U("1613919113640-25732ec5a61a"),
  "lays-masala.jpg":           U("1613919113640-25732ec5a61a"),
  "kurkure.jpg":               U("1613919113640-25732ec5a61a"),
  "kurkure-chutney.jpg":       U("1613919113640-25732ec5a61a"),
  "haldiram-bhujia.jpg":       U("1567620905732-4ff05462f681"),
  "haldiram-aloo.jpg":         U("1567620905732-4ff05462f681"),
  "haldiram-mixture.jpg":      U("1567620905732-4ff05462f681"),
  "haldiram-peanuts.jpg":      U("1601055283742-89e0c76f9d9f"),
  "bikaji-bhujia.jpg":         U("1567620905732-4ff05462f681"),
  "bikaji-mixture.jpg":        U("1567620905732-4ff05462f681"),
  "haldiram.jpg":              U("1567620905732-4ff05462f681"),

  // ── Tea ──
  "tata-tea.jpg":              U("1544787219-7f47ccb76574"),
  "tata-tea-premium.jpg":      U("1544787219-7f47ccb76574"),
  "tata-tea-agni.jpg":         U("1544787219-7f47ccb76574"),
  "red-label.jpg":             U("1544787219-7f47ccb76574"),
  "taaza-tea.jpg":             U("1544787219-7f47ccb76574"),
  "lipton-tea.jpg":            U("1544787219-7f47ccb76574"),

  // ── Coffee ──
  "bru.jpg":                   U("1495474472287-4d71bcdd2085"),
  "bru-gold.jpg":              U("1495474472287-4d71bcdd2085"),
  "nescafe.jpg":               U("1495474472287-4d71bcdd2085"),
  "nescafe-gold.jpg":          U("1495474472287-4d71bcdd2085"),

  // ── Cold Drinks / Beverages ──
  "coca-cola.jpg":             U("1554866585-74e9f24d7b6b"),
  "thums-up.jpg":              U("1554866585-74e9f24d7b6b"),
  "pepsi.jpg":                 U("1554866585-74e9f24d7b6b"),
  "sprite.jpg":                U("1554866585-74e9f24d7b6b"),
  "limca.jpg":                 U("1554866585-74e9f24d7b6b"),
  "fanta.jpg":                 U("1554866585-74e9f24d7b6b"),
  "red-bull.jpg":              U("1622543557-13384204507-7c8f8f8f8f8f"),
  "monster.jpg":               U("1554866585-74e9f24d7b6b"),
  "tropicana.jpg":             U("1600271886742-f049cd451bba"),
  "real-juice.jpg":            U("1600271886742-f049cd451bba"),
  "rasna.jpg":                 U("1560717789-0ac749f5805f"),
  "tang.jpg":                  U("1560717789-0ac749f5805f"),

  // ── Personal Care ──
  "colgate-maxfresh.jpg":      U("1556228578-8c89e6adf883"),
  "colgate-strong.jpg":        U("1556228578-8c89e6adf883"),
  "colgate-total.jpg":         U("1556228578-8c89e6adf883"),
  "sensodyne.jpg":             U("1556228578-8c89e6adf883"),
  "pepsodent.jpg":             U("1556228578-8c89e6adf883"),
  "close-up.jpg":              U("1556228578-8c89e6adf883"),
  "colgate.jpg":               U("1556228578-8c89e6adf883"),
  "oral-b.jpg":                U("1617470703305-f01d1e2b27b6"),
  "colgate-360.jpg":           U("1617470703305-f01d1e2b27b6"),
  "listerine.jpg":             U("1556228578-8c89e6adf883"),
  "dettol-liquid.jpg":         U("1584308666744-1baaacef9521"),
  "savlon.jpg":                U("1584308666744-1baaacef9521"),
  "dettol-soap.jpg":           U("1607006343-56a2da10f16e"),
  "lifebuoy.jpg":              U("1607006343-56a2da10f16e"),
  "dove-soap.jpg":             U("1607006343-56a2da10f16e"),
  "pears.jpg":                 U("1607006343-56a2da10f16e"),
  "lux.jpg":                   U("1607006343-56a2da10f16e"),

  // ── Detergent & Household ──
  "rin.jpg":                   U("1585771724684-38c0f8b9f6b8"),
  "surf-excel-powder.jpg":     U("1585771724684-38c0f8b9f6b8"),
  "surf-excel.jpg":            U("1585771724684-38c0f8b9f6b8"),
  "ariel.jpg":                 U("1585771724684-38c0f8b9f6b8"),
  "tide.jpg":                  U("1585771724684-38c0f8b9f6b8"),
  "vim-gel.jpg":               U("1585771724684-38c0f8b9f6b8"),
  "vim-bar.jpg":               U("1585771724684-38c0f8b9f6b8"),
  "pril.jpg":                  U("1585771724684-38c0f8b9f6b8"),
  "harpic.jpg":                U("1585771724684-38c0f8b9f6b8"),
  "domex.jpg":                 U("1585771724684-38c0f8b9f6b8"),
  "lizol.jpg":                 U("1585771724684-38c0f8b9f6b8"),
  "colin.jpg":                 U("1585771724684-38c0f8b9f6b8"),

  // ── Hair Care ──
  "parachute.jpg":             U("1526045612212-70cac16dd491"),
  "bajaj-almond.jpg":          U("1526045612212-70cac16dd491"),
  "dabur-amla.jpg":            U("1526045612212-70cac16dd491"),
  "head-shoulders.jpg":        U("1526045612212-70cac16dd491"),
  "pantene.jpg":               U("1526045612212-70cac16dd491"),
  "dove-shampoo.jpg":          U("1526045612212-70cac16dd491"),
  "clinic-plus.jpg":           U("1526045612212-70cac16dd491"),
  "sunsilk.jpg":               U("1526045612212-70cac16dd491"),

  // ── Skin Care ──
  "nivea-soft.jpg":            U("1556228578-8c89e6adf883"),
  "vaseline.jpg":              U("1556228578-8c89e6adf883"),
  "ponds.jpg":                 U("1556228578-8c89e6adf883"),
  "garnier-micellar.jpg":      U("1556228578-8c89e6adf883"),
  "lakme-sunscreen.jpg":       U("1556228578-8c89e6adf883"),

  // ── Dairy: Milk ──
  "amul-milk.jpg":             U("1550583724-b2692b85b150"),
  "amul-gold.jpg":             U("1550583724-b2692b85b150"),
  "amul-slim.jpg":             U("1550583724-b2692b85b150"),
  "mother-dairy-milk.jpg":     U("1550583724-b2692b85b150"),
  "mother-dairy-fc.jpg":       U("1550583724-b2692b85b150"),
  "milkmaid.jpg":              U("1550583724-b2692b85b150"),

  // ── Dairy: Butter & Ghee ──
  "amul-butter.jpg":           U("1589985270826-4b7bb135bc9d"),
  "amul-salted-butter.jpg":    U("1589985270826-4b7bb135bc9d"),
  "gowardhan-ghee.jpg":        U("1589985270826-4b7bb135bc9d"),
  "amul-ghee.jpg":             U("1589985270826-4b7bb135bc9d"),
  "mother-dairy-ghee.jpg":     U("1589985270826-4b7bb135bc9d"),

  // ── Dairy: Curd ──
  "curd.jpg":                  U("1488477181946-6428a0291777"),
  "amul-dahi.jpg":             U("1488477181946-6428a0291777"),
  "mother-dairy-dahi.jpg":     U("1488477181946-6428a0291777"),

  // ── Dairy: Cheese & Paneer ──
  "paneer.jpg":                U("1631452180539-5c6374638b07"),
  "amul-paneer.jpg":           U("1631452180539-5c6374638b07"),
  "amul-cheese-block.jpg":     U("1452195100486-0248474dffd9"),
  "amul-cheese.jpg":           U("1452195100486-0248474dffd9"),
  "britannia-cheese.jpg":      U("1452195100486-0248474dffd9"),

  // ── Dairy: Eggs ──
  "eggs.jpg":                  U("1587486913049-53fc88980cfc"),
  "suguna-eggs.jpg":           U("1587486913049-53fc88980cfc"),
  "brown-eggs.jpg":            U("1587486913049-53fc88980cfc"),

  // ── Dairy: Drinks ──
  "amul-lassi.jpg":            U("1560717789-0ac749f5805f"),
  "amul-kool.jpg":             U("1560717789-0ac749f5805f"),
  "yakult.jpg":                U("1560717789-0ac749f5805f"),

  // ── Bakery: Bread ──
  "pav.jpg":                   U("1509440159596-0249088772ff"),
  "burger-bun.jpg":            U("1509440159596-0249088772ff"),
  "sandwich-bread.jpg":        U("1509440159596-0249088772ff"),
  "britannia-wheat-bread.jpg": U("1509440159596-0249088772ff"),
  "modern-bread.jpg":          U("1509440159596-0249088772ff"),
  "multigrain-bread.jpg":      U("1509440159596-0249088772ff"),
  "garlic-bread.jpg":          U("1509440159596-0249088772ff"),
  "pizza-base.jpg":            U("1513104890138-7c749659a591"),
  "focaccia.jpg":              U("1509440159596-0249088772ff"),

  // ── Bakery: Cakes ──
  "truffle-cake.jpg":          U("1578985545062-bc5f6f90ded8"),
  "black-forest.jpg":          U("1578985545062-bc5f6f90ded8"),
  "pineapple-cake.jpg":        U("1464305795204-6f5bbfc7fb81"),
  "fruit-cake.jpg":            U("1578985545062-bc5f6f90ded8"),
  "red-velvet.jpg":            U("1578985545062-bc5f6f90ded8"),
  "cake-bites.jpg":            U("1578985545062-bc5f6f90ded8"),
  "banana-walnut.jpg":         U("1602351447937-f6aab71d7801"),

  // ── Bakery: Pastry ──
  "croissant.jpg":             U("1509722747041-616f39b57264"),
  "donuts.jpg":                U("1551024601-bec78aea364b"),

  // ── Bakery: Snacks ──
  "rusk.jpg":                  U("1558961363-fa8fdf82db35"),
  "khari.jpg":                 U("1558961363-fa8fdf82db35"),

  // ── Vegetables ──
  "tomato.jpg":                U("1546094096-0df4bcaaa337"),
  "onion.jpg":                 U("1620574387457-ae588e6f8f37"),
  "potato.jpg":                U("1518977676253-16739175f3b1"),
  "ginger.jpg":                U("1615485290382-441e4aa8a561"),
  "garlic.jpg":                U("1615485290382-441e4aa8a561"),
  "green-chilli.jpg":          U("1605050800889-d39e56b09d7a"),
  "spinach.jpg":               U("1576045057995-568f588f82fb"),
  "methi.jpg":                 U("1576045057995-568f588f82fb"),
  "coriander.jpg":             U("1576045057995-568f588f82fb"),
  "curry-leaves.jpg":          U("1576045057995-568f588f82fb"),
  "capsicum.jpg":              U("1587735243615-c1a03b616c8e"),
  "red-capsicum.jpg":          U("1587735243615-c1a03b616c8e"),
  "carrot.jpg":                U("1590165628577-0c25b11c1b44"),
  "cauliflower.jpg":           U("1568584711075-3d021a7c3ca3"),
  "peas.jpg":                  U("1587348468148-eabfa36daa26"),
  "brinjal.jpg":               U("1613119233723-7e38df40d0c9"),
  "bhindi.jpg":                U("1617575521317-d7f66fe16de8"),
  "karela.jpg":                U("1540420773420-3366772f4999"),
  "lauki.jpg":                 U("1540420773420-3366772f4999"),
  "drumstick.jpg":             U("1540420773420-3366772f4999"),

  // ── Fruits ──
  "banana.jpg":                U("1528825871115-3581a5387919"),
  "apple.jpg":                 U("1560806887-1e4ed0962764"),
  "lemon.jpg":                 U("1587830736-ab6ed71da8a4"),
  "mango.jpg":                 U("1601493700631-2b16ec4b4716"),
  "pomegranate.jpg":           U("1541656016964-de91c3a622c0"),
  "papaya.jpg":                U("1530171538386-cff0dbf879a3"),
  "watermelon.jpg":            U("1571680322279-aea759a8ef91"),
  "grapes.jpg":                U("1537640538966-79f369143f8f"),

  // ── Fish & Seafood ──
  "surmai.jpg":                U("1534482421-64566f976cfa"),
  "pomfret.jpg":               U("1534482421-64566f976cfa"),
  "black-pomfret.jpg":         U("1534482421-64566f976cfa"),
  "rawas.jpg":                 U("1534482421-64566f976cfa"),
  "hilsa.jpg":                 U("1534482421-64566f976cfa"),
  "prawns.jpg":                U("1510130387422-82bed34b37e9"),
  "tiger-prawns.jpg":          U("1510130387422-82bed34b37e9"),
  "crab.jpg":                  U("1559715745-e1b7c2a4bc0e"),
  "squid.jpg":                 U("1534482421-64566f976cfa"),
  "bangda.jpg":                U("1534482421-64566f976cfa"),
  "baby-pomfret.jpg":          U("1534482421-64566f976cfa"),
  "bombil-fresh.jpg":          U("1534482421-64566f976cfa"),
  "rohu.jpg":                  U("1534482421-64566f976cfa"),
  "katla.jpg":                 U("1534482421-64566f976cfa"),
  "tilapia.jpg":               U("1534482421-64566f976cfa"),
  "bombil.jpg":                U("1534482421-64566f976cfa"),
  "dried-prawns.jpg":          U("1510130387422-82bed34b37e9"),
  "salmon.jpg":                U("1467003909585-2f8a72700288"),
  "basa.jpg":                  U("1534482421-64566f976cfa"),
};

// ─── Category fallback images (used when no per-product override exists) ─────
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  flours:         U("1574323347407-f5e1ad6d020b"),
  staples:        U("1536304929831-ee1ca9d44906"),
  pulses:         U("1589301760014-d929f3979dbc"),
  oils:           U("1474979266404-7eaacbcd87c5"),
  instant:        U("1612929633738-8fe44f7ec841"),
  spices:         U("1596040033229-a9821ebd058d"),
  condiments:     U("1561181286-d3f19c8b7b6c"),
  biscuits:       U("1558961363-fa8fdf82db35"),
  snacks:         U("1567620905732-4ff05462f681"),
  beverages:      U("1544787219-7f47ccb76574"),
  "personal-care":U("1556228578-8c89e6adf883"),
  household:      U("1585771724684-38c0f8b9f6b8"),
  soaps:          U("1607006343-56a2da10f16e"),
  milk:           U("1550583724-b2692b85b150"),
  butter:         U("1589985270826-4b7bb135bc9d"),
  curd:           U("1488477181946-6428a0291777"),
  cheese:         U("1452195100486-0248474dffd9"),
  eggs:           U("1587486913049-53fc88980cfc"),
  bread:          U("1509440159596-0249088772ff"),
  cakes:          U("1578985545062-bc5f6f90ded8"),
  pastry:         U("1509722747041-616f39b57264"),
  vegetables:     U("1540420773420-3366772f4999"),
  leafy:          U("1576045057995-568f588f82fb"),
  fruits:         U("1610832958506-aa56368176cf"),
  premium:        U("1534482421-64566f976cfa"),
  shellfish:      U("1510130387422-82bed34b37e9"),
  local:          U("1534482421-64566f976cfa"),
  freshwater:     U("1534482421-64566f976cfa"),
  dried:          U("1534482421-64566f976cfa"),
  imported:       U("1467003909585-2f8a72700288"),
  general:        U("1542838132-92c53300491e"),
};

// ─── Sector fallback (last resort) ───────────────────────────────────────────
export const SECTOR_FALLBACK_IMAGES: Record<string, string> = {
  kirana:  U("1542838132-92c53300491e"),
  dairy:   U("1550583724-b2692b85b150"),
  bakery:  U("1509440159596-0249088772ff"),
  veggies: U("1540420773420-3366772f4999"),
  fish:    U("1534482421-64566f976cfa"),
};

/**
 * Deterministic slug generator matching the product name.
 * Produces dash-normalised filename key for PRODUCT_IMAGE_OVERRIDES lookup.
 */
export function productNameToImageSlug(productName: string): string {
  return (
    productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + ".jpg"
  );
}

/**
 * Brand/variant-aware deterministic catalog asset path generator.
 * Returns a `/media/catalog/{snake_slug}.jpg` URL.
 * The web media proxy resolves this to the correct Unsplash CDN image
 * when no local file exists, guaranteeing a correct subcategory image
 * rather than a generic cross-category fallback.
 *
 * Examples:
 *   "Priya Refined Sunflower Oil"  → /media/catalog/priya_refined_sunflower_oil.jpg
 *   "Raw Prawns"                   → /media/catalog/raw_prawns.jpg
 *   "Head & Shoulders 90 mL"       → /media/catalog/head_and_shoulders_90_ml.jpg
 */
export function getProductAssetPath(name: string, _category?: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[()[\]{}'"]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return `/media/catalog/${slug}.jpg`;
}

/**
 * Resolve a product image URL with 4-level fallback:
 * 1. Already-a-URL pass-through
 * 2. Exact filename key in PRODUCT_IMAGE_OVERRIDES (dash & underscore normalised)
 * 3. Category fallback
 * 4. Sector fallback
 */
export function resolveProductImage(
  imageFile: string,
  category: string,
  sector: string,
  productName?: string,
): string {
  const trimmed = imageFile.trim();

  // Pass-through full URLs unchanged
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Normalise to dash-based slug for lookup (handles both _ and - separators)
  const raw = trimmed.replace(/^catalog\//, "").replace(/\.jpg$/i, "");
  const dashSlug = raw
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    + ".jpg";

  if (PRODUCT_IMAGE_OVERRIDES[dashSlug]) return PRODUCT_IMAGE_OVERRIDES[dashSlug];

  // Try deterministic name-based slug if a product name was supplied
  if (productName) {
    const nameSlug = productNameToImageSlug(productName);
    if (PRODUCT_IMAGE_OVERRIDES[nameSlug]) return PRODUCT_IMAGE_OVERRIDES[nameSlug];

    // Try first-word prefix match (e.g. "maggi" matches "maggi-atta")
    const firstWord = nameSlug.split("-")[0];
    for (const [key, url] of Object.entries(PRODUCT_IMAGE_OVERRIDES)) {
      if (key.startsWith(firstWord + "-") || key === firstWord + ".jpg") return url;
    }
  }

  // Category fallback
  const cat = category.trim().toLowerCase();
  if (CATEGORY_FALLBACK_IMAGES[cat]) return CATEGORY_FALLBACK_IMAGES[cat];

  // Sector fallback
  const sec = sector.trim().toLowerCase();
  return SECTOR_FALLBACK_IMAGES[sec] ?? U("1542838132-92c53300491e");
}
