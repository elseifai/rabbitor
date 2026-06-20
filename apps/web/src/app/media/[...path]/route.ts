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
// Keywords are matched against a space-separated normalized slug (underscores → spaces)
// so word boundary \b works correctly between words.
const KEYWORD_MAP: Array<[RegExp, string]> = [
  // Foods — specific first
  [/(atta|wheat|chakki|flour|roti)/,    '1574323347407-f5e1ad6d020b'],
  [/(basmati|biryani)/,                 '1536304929831-ee1ca9d44906'],
  [/(oat|oats|porridge)/,               '1593491034932-844af9e27e3c'],
  [/\bsalt\b|iodized/,                  '1518110925495-5fe2fda0442a'],
  [/(sunflower|soybean|refined|mustard|groundnut|\boil\b)/, '1474979266404-7eaacbcd87c5'],
  [/(lentil|\bdal\b|moong|toor|masoor|urad|\bchana\b)/, '1589301760014-d929f3979dbc'],
  [/(rajma|kidney bean)/,               '1547592166-23ac45744acd'],
  [/(chhole|chickpea|kabuli)/,          '1631452180775-17f56e5cdeb5'],
  [/(noodles|hakka|ramen|instant)/,     '1612929633738-8fe44f7ec841'],
  [/(garam|masala|\bspice)/,            '1596040033229-a9821ebd058d'],
  [/(chilli|chily|chilly|red pepper)/,  '1605050800889-d39e56b09d7a'],
  [/(turmeric|haldi)/,                  '1615485290382-441e4aa8a561'],
  [/(coriander|dhaniya|cumin|jeera)/,   '1576045057995-568f588f82fb'],
  [/(ketchup|tomato sauce)/,            '1561181286-d3f19c8b7b6c'],
  [/(soy sauce|\bsoy\b)/,               '1569050467447-ce54b3bbc37d'],
  // Snacks & Biscuits
  [/(biscuit|cookie|cracker|marie|digestive|good day|krackjack|parle)/, '1558961363-fa8fdf82db35'],
  [/(cake|cupcake|truffle|forest|velvet|chocolate sponge)/, '1578985545062-bc5f6f90ded8'],
  [/(rusk|khari)/,                      '1558961363-fa8fdf82db35'],
  [/(bread|\bpav\b|\bbun\b|loaf|sandwich|focaccia|multigrain)/, '1509440159596-0249088772ff'],
  [/\bpizza\b/,                         '1513104890138-7c749659a591'],
  [/croissant/,                         '1509722747041-616f39b57264'],
  [/(donut|doughnut)/,                  '1551024601-bec78aea364b'],
  [/(chips|lays|kurkure|namkeen)/,      '1613919113640-25732ec5a61a'],
  [/(bhujia|mixture|haldiram|bikaji)/,  '1567620905732-4ff05462f681'],
  // Beverages
  [/\btea\b|chai/,                      '1544787219-7f47ccb76574'],
  [/(coffee|nescafe|\bbru\b|espresso)/, '1495474472287-4d71bcdd2085'],
  [/(cola|pepsi|sprite|thums up|coca cola|fanta|limca)/, '1554866585-74e9f24d7b6b'],
  [/(juice|tropicana|fruit drink)/,     '1600271886742-f049cd451bba'],
  [/(red bull|monster|energy drink)/,   '1554866585-74e9f24d7b6b'],
  [/(water|bisleri|\baqua\b)/,          '1548036161-a00dc84f2e1f'],
  [/(rasna|tang|powder drink)/,         '1560717789-0ac749f5805f'],
  // Personal care — hair first (before generic "shampoo" catch-all)
  [/(shampoo|conditioner|hair oil|dandruff|head shoulders|head and shoulders|pantene|clinic plus|sunsilk)/, '1526045612212-70cac16dd491'],
  [/(toothpaste|toothbrush|colgate|pepsodent|sensodyne|mouthwash|listerine|closeup)/, '1556228578-8c89e6adf883'],
  [/(antiseptic|dettol|savlon|sanitizer)/, '1584308666744-1baaacef9521'],
  [/(lotion|moisturizer|sunscreen|face wash|skincare|nivea|vaseline|ponds|garnier|lakme)/, '1556228578-8c89e6adf883'],
  [/(detergent|surf excel|ariel|\btide\b|\brin\b|washing powder)/, '1585771724684-38c0f8b9f6b8'],
  [/(dishwash|\bvim\b|\bpril\b|utensil)/, '1585771724684-38c0f8b9f6b8'],
  [/(cleaner|harpic|domex|lizol|colin)/, '1585771724684-38c0f8b9f6b8'],
  [/(\bsoap\b|body wash|lifebuoy|\blux\b|pears|dove)/,  '1607006343-56a2da10f16e'],
  // Dairy
  [/paneer/,                            '1631452180539-5c6374638b07'],
  [/(cheese|cheddar)/,                  '1452195100486-0248474dffd9'],
  [/(butter|ghee)/,                     '1589985270826-4b7bb135bc9d'],
  [/(curd|\bdahi\b|yogurt|buttermilk)/, '1488477181946-6428a0291777'],
  [/(condensed milk|milkmaid)/,         '1550583724-b2692b85b150'],
  [/(lassi|milkshake|probiotic|yakult)/, '1560717789-0ac749f5805f'],
  [/(\begg\b|\beggs\b)/,                '1587486913049-53fc88980cfc'],
  [/\bmilk\b/,                          '1550583724-b2692b85b150'],
  // Seafood — specific first
  [/(prawn|shrimp|jhinga)/,             '1510130387422-82bed34b37e9'],
  [/(crab|lobster)/,                    '1559715745-e1b7c2a4bc0e'],
  [/(salmon|atlantic)/,                 '1467003909585-2f8a72700288'],
  [/(squid|calamari)/,                  '1534482421-64566f976cfa'],
  [/(fish|surmai|pomfret|rawas|rohu|katla|hilsa|bangda|mackerel|bombil|\bbasa\b|tilapia|seafood)/, '1534482421-64566f976cfa'],
  // Vegetables
  [/(tomato|tamatar)/,                  '1546094096-0df4bcaaa337'],
  [/(onion|\bpyaz\b)/,                  '1620574387457-ae588e6f8f37'],
  [/(potato|\baloo\b)/,                 '1518977676253-16739175f3b1'],
  [/(ginger|adrak)/,                    '1615485290382-441e4aa8a561'],
  [/(garlic|lehsun)/,                   '1615485290382-441e4aa8a561'],
  [/(green chilli|chilli|mirchi)/,      '1605050800889-d39e56b09d7a'],
  [/(spinach|palak)/,                   '1576045057995-568f588f82fb'],
  [/(coriander|methi|curry leaves|leafy)/, '1576045057995-568f588f82fb'],
  [/(capsicum|shimla|bell pepper)/,     '1587735243615-c1a03b616c8e'],
  [/(carrot|gajar)/,                    '1590165628577-0c25b11c1b44'],
  [/(cauliflower|gobhi|broccoli)/,      '1568584711075-3d021a7c3ca3'],
  [/(\bpeas\b|matar)/,                  '1587348468148-eabfa36daa26'],
  [/(brinjal|baingan|eggplant)/,        '1613119233723-7e38df40d0c9'],
  [/(bhindi|okra|ladyfinger)/,          '1617575521317-d7f66fe16de8'],
  [/(bitter gourd|karela|drumstick|lauki|gourd)/, '1540420773420-3366772f4999'],
  // Fruits
  [/(banana|\bkela\b)/,                 '1528825871115-3581a5387919'],
  [/(\bapple\b|\bseb\b)/,               '1560806887-1e4ed0962764'],
  [/(lemon|nimbu|\blime\b)/,            '1587830736-ab6ed71da8a4'],
  [/(mango|alphonso|\baam\b)/,          '1601493700631-2b16ec4b4716'],
  [/(pomegranate|anar)/,                '1541656016964-de91c3a622c0'],
  [/(watermelon|tarbuz)/,               '1571680322279-aea759a8ef91'],
  [/(grapes|angoor)/,                   '1537640538966-79f369143f8f'],
  [/(papaya|pawpaw)/,                   '1530171538386-cff0dbf879a3'],
  // Fallback category slugs
  [/fallback (atta|flour)/,             '1574323347407-f5e1ad6d020b'],
  [/fallback (rice|staple)/,            '1536304929831-ee1ca9d44906'],
  [/fallback oil/,                      '1474979266404-7eaacbcd87c5'],
  [/fallback pulse/,                    '1589301760014-d929f3979dbc'],
  [/fallback spice/,                    '1596040033229-a9821ebd058d'],
  [/fallback instant/,                  '1612929633738-8fe44f7ec841'],
  [/fallback biscuit/,                  '1558961363-fa8fdf82db35'],
  [/fallback snack/,                    '1567620905732-4ff05462f681'],
  [/fallback beverage/,                 '1544787219-7f47ccb76574'],
  [/fallback personal care/,            '1556228578-8c89e6adf883'],
  [/fallback household/,                '1585771724684-38c0f8b9f6b8'],
  [/fallback soap/,                     '1607006343-56a2da10f16e'],
  [/fallback milk/,                     '1550583724-b2692b85b150'],
  [/fallback butter/,                   '1589985270826-4b7bb135bc9d'],
  [/fallback curd/,                     '1488477181946-6428a0291777'],
  [/fallback cheese/,                   '1452195100486-0248474dffd9'],
  [/fallback egg/,                      '1587486913049-53fc88980cfc'],
  [/fallback bread/,                    '1509440159596-0249088772ff'],
  [/fallback cake/,                     '1578985545062-bc5f6f90ded8'],
  [/fallback pastry/,                   '1509722747041-616f39b57264'],
  [/fallback (veggie|vegetable)/,       '1540420773420-3366772f4999'],
  [/fallback leafy/,                    '1576045057995-568f588f82fb'],
  [/fallback fruit/,                    '1610832958506-aa56368176cf'],
  [/fallback (fish|shellfish)/,         '1534482421-64566f976cfa'],
  [/fallback poultry/,                  '1542838132-92c53300491e'],
  [/fallback condiment/,                '1561181286-d3f19c8b7b6c'],
]

function resolveSlugToUnsplash(slug: string): string | null {
  // Normalize slug: strip extension, replace separators with space, lowercase
  const normalized = slug.replace(/\.jpg$/i, '').replace(/[_\-\s]+/g, ' ').toLowerCase()
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
