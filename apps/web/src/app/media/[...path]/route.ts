import { readFile, stat } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { getUploadRoot } from '@/lib/media-storage'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

// ─── Unsplash CDN helper ──────────────────────────────────────────────────────
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=400&fit=crop&auto=format&q=80`

/**
 * Keyword → Unsplash photo ID lookup.
 * Used when a requested /media/catalog/*.jpg file doesn't exist locally.
 * Keywords are checked in order against the normalised filename slug.
 */
const KEYWORD_MAP: Array<[RegExp, string]> = [
  // Foods — specific
  [/\b(atta|wheat|chakki|flour|roti)\b/, '1574323347407-f5e1ad6d020b'],
  [/\b(basmati|rice|biryani)\b/,         '1536304929831-ee1ca9d44906'],
  [/\b(oat|oats|porridge)\b/,            '1593491034932-844af9e27e3c'],
  [/\b(salt|iodized)\b/,                 '1518110925495-5fe2fda0442a'],
  [/\b(oil|sunflower|soybean|refined|mustard|groundnut)\b/, '1474979266404-7eaacbcd87c5'],
  [/\b(dal|lentil|moong|toor|masoor|urad|chana)\b/, '1589301760014-d929f3979dbc'],
  [/\b(rajma|kidney)\b/,                 '1547592166-23ac45744acd'],
  [/\b(chhole|chickpea|kabuli)\b/,       '1631452180775-17f56e5cdeb5'],
  [/\b(noodles|maggi|hakka|ramen|instant)\b/, '1612929633738-8fe44f7ec841'],
  [/\b(garam|masala|spice|spices)\b/,    '1596040033229-a9821ebd058d'],
  [/\b(chilli|chili|chilly|pepper|red_chilli)\b/, '1605050800889-d39e56b09d7a'],
  [/\b(turmeric|haldi)\b/,               '1615485290382-441e4aa8a561'],
  [/\b(coriander|dhaniya|cumin|jeera)\b/,'1576045057995-568f588f82fb'],
  [/\b(ketchup|sauce|tomato_sauce)\b/,   '1561181286-d3f19c8b7b6c'],
  [/\b(soy_sauce|soy|dark_sauce)\b/,     '1569050467447-ce54b3bbc37d'],
  // Snacks & Biscuits
  [/\b(biscuit|cookie|cracker|marie|digestive|hide_seek|good_day|krackjack|parle)\b/, '1558961363-fa8fdf82db35'],
  [/\b(cake|cupcake|pastry|truffle|forest|velvet)\b/, '1578985545062-bc5f6f90ded8'],
  [/\b(rusk|khari|toast)\b/,             '1558961363-fa8fdf82db35'],
  [/\b(bread|pav|bun|loaf|sandwich|focaccia|multigrain)\b/, '1509440159596-0249088772ff'],
  [/\b(pizza)\b/,                        '1513104890138-7c749659a591'],
  [/\b(croissant)\b/,                    '1509722747041-616f39b57264'],
  [/\b(donut|doughnut)\b/,              '1551024601-bec78aea364b'],
  [/\b(chips|lays|kurkure|namkeen)\b/,   '1613919113640-25732ec5a61a'],
  [/\b(bhujia|mixture|snack|haldiram|bikaji)\b/, '1567620905732-4ff05462f681'],
  // Beverages
  [/\b(tea|chai|darjeeling|assam)\b/,    '1544787219-7f47ccb76574'],
  [/\b(coffee|nescafe|bru|espresso)\b/,  '1495474472287-4d71bcdd2085'],
  [/\b(cola|pepsi|sprite|thums_up|coca_cola|fanta|limca)\b/, '1554866585-74e9f24d7b6b'],
  [/\b(juice|tropicana|real|fruit_drink)\b/, '1600271886742-f049cd451bba'],
  [/\b(energy_drink|red_bull|monster)\b/,'1554866585-74e9f24d7b6b'],
  [/\b(water|bisleri|aqua)\b/,           '1548036161-a00dc84f2e1f'],
  [/\b(rasna|tang|powder_drink)\b/,      '1560717789-0ac749f5805f'],
  // Personal care
  [/\b(shampoo|conditioner|hair_oil|dandruff|head_shoulders|dove|pantene|clinic|sunsilk)\b/, '1526045612212-70cac16dd491'],
  [/\b(toothpaste|toothbrush|colgate|pepsodent|sensodyne|oral|closeup|mouthwash|listerine)\b/, '1556228578-8c89e6adf883'],
  [/\b(soap|body_wash|lifebuoy|dove_soap|lux|pears)\b/, '1607006343-56a2da10f16e'],
  [/\b(antiseptic|dettol|savlon|sanitizer)\b/, '1584308666744-1baaacef9521'],
  [/\b(lotion|moisturizer|sunscreen|face_wash|skincare|nivea|vaseline|ponds|garnier|lakme)\b/, '1556228578-8c89e6adf883'],
  [/\b(detergent|surf|ariel|tide|rin|washing)\b/, '1585771724684-38c0f8b9f6b8'],
  [/\b(dishwash|vim|pril|utensil)\b/,    '1585771724684-38c0f8b9f6b8'],
  [/\b(cleaner|harpic|domex|lizol|colin|floor)\b/, '1585771724684-38c0f8b9f6b8'],
  // Dairy
  [/\b(paneer)\b/,                        '1631452180539-5c6374638b07'],
  [/\b(cheese|cheddar|slices)\b/,        '1452195100486-0248474dffd9'],
  [/\b(butter|ghee)\b/,                  '1589985270826-4b7bb135bc9d'],
  [/\b(curd|dahi|yogurt|buttermilk)\b/,  '1488477181946-6428a0291777'],
  [/\b(milk|dairy|cream|condensed)\b/,   '1550583724-b2692b85b150'],
  [/\b(lassi|milkshake|probiotic|yakult)\b/, '1560717789-0ac749f5805f'],
  [/\b(egg|eggs|brown_egg)\b/,           '1587486913049-53fc88980cfc'],
  // Seafood & Fish — specific first
  [/\b(prawn|shrimp|jhinga)\b/,          '1510130387422-82bed34b37e9'],
  [/\b(crab|lobster)\b/,                 '1559715745-e1b7c2a4bc0e'],
  [/\b(salmon|atlantic)\b/,              '1467003909585-2f8a72700288'],
  [/\b(squid|calamari)\b/,              '1534482421-64566f976cfa'],
  [/\b(fish|surmai|pomfret|rawas|rohu|katla|hilsa|bangda|mackerel|bombil|basa|tilapia)\b/, '1534482421-64566f976cfa'],
  // Vegetables
  [/\b(tomato|tamatar)\b/,               '1546094096-0df4bcaaa337'],
  [/\b(onion|pyaz)\b/,                   '1620574387457-ae588e6f8f37'],
  [/\b(potato|aloo)\b/,                  '1518977676253-16739175f3b1'],
  [/\b(ginger|adrak|adrak_paste)\b/,     '1615485290382-441e4aa8a561'],
  [/\b(garlic|lehsun)\b/,                '1615485290382-441e4aa8a561'],
  [/\b(green_chilli|chilli|mirchi)\b/,   '1605050800889-d39e56b09d7a'],
  [/\b(spinach|palak)\b/,                '1576045057995-568f588f82fb'],
  [/\b(coriander|methi|curry_leaves|leafy)\b/, '1576045057995-568f588f82fb'],
  [/\b(capsicum|shimla|bell_pepper)\b/,  '1587735243615-c1a03b616c8e'],
  [/\b(carrot|gajar)\b/,                 '1590165628577-0c25b11c1b44'],
  [/\b(cauliflower|gobhi|broccoli)\b/,   '1568584711075-3d021a7c3ca3'],
  [/\b(peas|matar)\b/,                   '1587348468148-eabfa36daa26'],
  [/\b(brinjal|baingan|eggplant)\b/,     '1613119233723-7e38df40d0c9'],
  [/\b(bhindi|okra|ladyfinger)\b/,       '1617575521317-d7f66fe16de8'],
  [/\b(bitter_gourd|karela|drumstick|lauki|gourd)\b/, '1540420773420-3366772f4999'],
  // Fruits
  [/\b(banana|kela)\b/,                  '1528825871115-3581a5387919'],
  [/\b(apple|seb)\b/,                    '1560806887-1e4ed0962764'],
  [/\b(lemon|nimbu|lime)\b/,             '1587830736-ab6ed71da8a4'],
  [/\b(mango|alphonso|aam)\b/,           '1601493700631-2b16ec4b4716'],
  [/\b(pomegranate|anar)\b/,             '1541656016964-de91c3a622c0'],
  [/\b(watermelon|tarbuz)\b/,            '1571680322279-aea759a8ef91'],
  [/\b(grapes|angoor)\b/,                '1537640538966-79f369143f8f'],
  [/\b(papaya|pawpaw)\b/,               '1530171538386-cff0dbf879a3'],
  // Fallbacks by category keyword in path
  [/\bfallback_atta\b|fallback_flours?\b/,'1574323347407-f5e1ad6d020b'],
  [/\bfallback_rice\b|fallback_staples?\b/,'1536304929831-ee1ca9d44906'],
  [/\bfallback_oils?\b/,                 '1474979266404-7eaacbcd87c5'],
  [/\bfallback_pulses?\b/,              '1589301760014-d929f3979dbc'],
  [/\bfallback_spices?\b/,              '1596040033229-a9821ebd058d'],
  [/\bfallback_instant\b/,              '1612929633738-8fe44f7ec841'],
  [/\bfallback_biscuits?\b/,            '1558961363-fa8fdf82db35'],
  [/\bfallback_snacks?\b/,              '1567620905732-4ff05462f681'],
  [/\bfallback_beverages?\b/,           '1544787219-7f47ccb76574'],
  [/\bfallback_personal_care\b/,        '1556228578-8c89e6adf883'],
  [/\bfallback_household\b/,            '1585771724684-38c0f8b9f6b8'],
  [/\bfallback_soaps?\b/,               '1607006343-56a2da10f16e'],
  [/\bfallback_milk\b/,                 '1550583724-b2692b85b150'],
  [/\bfallback_butter\b/,               '1589985270826-4b7bb135bc9d'],
  [/\bfallback_curd\b/,                 '1488477181946-6428a0291777'],
  [/\bfallback_cheese\b/,               '1452195100486-0248474dffd9'],
  [/\bfallback_eggs?\b/,                '1587486913049-53fc88980cfc'],
  [/\bfallback_bread\b/,                '1509440159596-0249088772ff'],
  [/\bfallback_cakes?\b/,               '1578985545062-bc5f6f90ded8'],
  [/\bfallback_pastry\b/,               '1509722747041-616f39b57264'],
  [/\bfallback_veggies?\b|fallback_vegetables?\b/, '1540420773420-3366772f4999'],
  [/\bfallback_leafy\b/,                '1576045057995-568f588f82fb'],
  [/\bfallback_fruits?\b/,              '1610832958506-aa56368176cf'],
  [/\bfallback_fish\b/,                 '1534482421-64566f976cfa'],
  [/\bfallback_shellfish\b/,            '1510130387422-82bed34b37e9'],
  [/\bfallback_poultry\b/,              '1542838132-92c53300491e'],
  [/\bfallback_condiments?\b/,          '1561181286-d3f19c8b7b6c'],
]

function resolveSlugToUnsplash(slug: string): string | null {
  const normalized = slug.replace(/\.jpg$/i, '').replace(/[-\s]/g, '_').toLowerCase()
  for (const [regex, photoId] of KEYWORD_MAP) {
    if (regex.test(normalized)) {
      return U(photoId)
    }
  }
  return null
}

/** Serve uploaded media from Docker volume, with intelligent CDN fallback for catalog images. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params
  const filename = segments.join('/')

  if (!filename || filename.includes('..') || filename.startsWith('/')) {
    return new NextResponse('Not found', { status: 404 })
  }

  const filePath = path.join(getUploadRoot(), filename)

  // Try to serve the local file first
  try {
    const info = await stat(filePath)
    if (info.isFile()) {
      const buffer = await readFile(filePath)
      const ext = path.extname(filename).toLowerCase()
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': MIME[ext] ?? 'application/octet-stream',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    }
  } catch {
    // File not found — fall through to CDN resolution
  }

  // For catalog/ paths: resolve to the appropriate Unsplash CDN image
  if (filename.startsWith('catalog/')) {
    const slug = segments[segments.length - 1] ?? ''
    const unsplashUrl = resolveSlugToUnsplash(slug)

    if (unsplashUrl) {
      return NextResponse.redirect(unsplashUrl, {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=3600' },
      })
    }

    // Last-resort: generic grocery fallback
    return NextResponse.redirect(
      U('1542838132-92c53300491e'),
      { status: 302, headers: { 'Cache-Control': 'public, max-age=3600' } },
    )
  }

  return new NextResponse('Not found', { status: 404 })
}
