import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

const BASE_LAT = 19.1364
const BASE_LNG = 72.8296

type SeedProduct = {
  name: string
  description: string
  price: number
  unit: string
  stock?: number
}

type SeedShop = {
  slug: string
  name: string
  category: string
  address: string
  image: string
  lat: number
  lng: number
  fee: number
  prep: number
  minOrder?: number
  products: SeedProduct[]
}

const MARKETPLACE: SeedShop[] = [
  {
    slug: 'masoli-house',
    name: 'Masoli House',
    category: 'Premium Malvani Catch, Fresh Sea Fish, De-veined Prawns',
    address: 'Royal Heights Galleria, Block C, Andheri West, Mumbai',
    image:
      'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT + 0.006,
    lng: BASE_LNG - 0.002,
    fee: 40,
    prep: 22,
    products: [
      {
        name: 'Premium Surmai (Seer Fish) Steaks',
        description:
          'Meticulously scaled, lateral slit-cut ocean steaks, perfect for authentic fish fry.',
        price: 490,
        unit: '500g',
      },
      {
        name: 'Fresh Cleaned Tiger Prawns',
        description: 'Tail-on, completely de-veined crisp coastal medium prawns.',
        price: 380,
        unit: '250g',
      },
      {
        name: 'White Pomfret Whole',
        description: 'Premium grade whole white pomfret, completely gutted and pristine.',
        price: 680,
        unit: '1 kg',
      },
    ],
  },
  {
    slug: '99-corner-cloud-kitchen',
    name: '99 Corner Cloud Kitchen',
    category: 'Gourmet Fast Food, Smashed Burgers, Peri Peri Rolls',
    address: 'Arcade Junction, Basement Level 2, Andheri West, Mumbai',
    image:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT + 0.003,
    lng: BASE_LNG + 0.004,
    fee: 25,
    prep: 18,
    products: [
      {
        name: 'OG Smashed Double Cheese Burger',
        description:
          'Two juicy handmade patties, melted cheddar, signature house sauce, toasted brioche.',
        price: 249,
        unit: '1 unit',
      },
      {
        name: 'Crispy Peri Peri Chicken Roll',
        description:
          'Flaky rumali flatbread loaded with hot pepper chicken tenders and spicy cream.',
        price: 189,
        unit: '1 unit',
      },
      {
        name: 'Loaded Truffle Parmesan Fries',
        description:
          'Golden-fried potato batons laced with rich white truffle oil and shavings of cheese.',
        price: 149,
        unit: '1 box',
      },
    ],
  },
  {
    slug: 'crown-warriors-organic-mart',
    name: 'Crown Warriors Organic Mart',
    category: 'Fresh Farm Staples, Cold-Pressed Oils, Premium Grains',
    address: 'Sector 4 High Street Plaza, Andheri West, Mumbai',
    image:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT + 0.001,
    lng: BASE_LNG - 0.006,
    fee: 20,
    prep: 30,
    products: [
      {
        name: 'Cold-Pressed Mustard Oil (Kachi Ghani)',
        description:
          'Pure extract processed mechanically at low temperatures to lock natural sharpness.',
        price: 210,
        unit: '1 litre',
      },
      {
        name: 'Organic Unpolished Basmati Rice',
        description: 'Long-grain, premium aged aroma rice perfect for daily structural meals.',
        price: 135,
        unit: '1 kg',
      },
      {
        name: 'Pure Himalayan Rock Salt Crystals',
        description:
          'Mineral-rich pink salt granules, pristine and naturally ground without synthetic processing.',
        price: 85,
        unit: '500g',
      },
    ],
  },
  {
    slug: 'royal-coastal-seafood',
    name: 'Royal Coastal Seafood Stall',
    category: 'Sea Fish, Cleaned Shrimp, Marinated Fry',
    address: 'Sector 4 Arcade, Main Market Block, Andheri West, Mumbai',
    image:
      'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT + 0.008,
    lng: BASE_LNG - 0.004,
    fee: 35,
    prep: 18,
    products: [
      {
        name: 'Marinated Fish Fry Tikka',
        description: 'Coated in authentic spices, ready to shallow fry instantly.',
        price: 290,
        unit: '400g',
      },
      {
        name: 'Fresh Tiger Prawns (Medium)',
        description: 'De-veined, deshelled, and tail-on crisp coastal medium prawns.',
        price: 380,
        unit: '250g',
      },
      {
        name: 'Bombil (Bombay Duck) - Sun Dried',
        description: 'Classic Konkan delicacy, lightly salted and air-dried for crispy fry.',
        price: 220,
        unit: '250g',
      },
    ],
  },
  {
    slug: 'sharma-kirana',
    name: 'Sharma Kirana Store',
    category: 'Kirana, Staples, Household Essentials',
    address: 'Sector 4 Arcade, Andheri West, Mumbai',
    image:
      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT + 0.002,
    lng: BASE_LNG + 0.001,
    fee: 20,
    prep: 12,
    products: [
      {
        name: 'Basmati Rice 1kg',
        description: 'Premium long-grain basmati for daily meals.',
        price: 120,
        unit: 'kg',
      },
      {
        name: 'Toor Dal 500g',
        description: 'Farm-sourced protein staple.',
        price: 85,
        unit: 'gm',
      },
      {
        name: 'Sunflower Oil 1L',
        description: 'Refined oil for everyday cooking.',
        price: 165,
        unit: 'piece',
      },
    ],
  },
  {
    slug: 'walkwell-footwear',
    name: 'WalkWell Footwear',
    category: 'Footwear, Sandals, Sports Shoes',
    address: 'Colaba Runway Store, Mumbai',
    image:
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT - 0.015,
    lng: BASE_LNG + 0.012,
    fee: 25,
    prep: 25,
    products: [
      {
        name: 'Running Shoes',
        description: 'Lightweight runners for Mumbai streets.',
        price: 1299,
        unit: 'pair',
      },
      {
        name: 'Leather Sandals',
        description: 'Handcrafted neighbourhood cobbler sandals.',
        price: 699,
        unit: 'pair',
      },
    ],
  },
  {
    slug: 'patel-vegetables',
    name: 'Patel Sabzi Mandi',
    category: 'Vegetables, Leafy Greens, Local Produce',
    address: 'Sabzi Mandi Lane, Andheri West, Mumbai',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    lat: BASE_LAT + 0.004,
    lng: BASE_LNG - 0.008,
    fee: 15,
    prep: 10,
    products: [
      {
        name: 'Tomatoes',
        description: 'Farm-fresh red tomatoes.',
        price: 40,
        unit: 'kg',
      },
      {
        name: 'Palak Bunch',
        description: 'Crisp leafy spinach bundle.',
        price: 25,
        unit: 'piece',
      },
      {
        name: 'Bhindi (Okra)',
        description: 'Tender green okra pods, sorted and washed.',
        price: 55,
        unit: 'kg',
      },
    ],
  },
]

async function main() {
  console.log('🧹 Purging obsolete database rows cleanly...')
  await prisma.orderStatusEvent.deleteMany({})
  await prisma.orderItem.deleteMany({})
  await prisma.order.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.shop.deleteMany({})

  console.log('👤 Provisioning platform users...')
  const merchant = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: { name: 'Raj Sharma', role: UserRole.MERCHANT },
    create: {
      name: 'Raj Sharma',
      phone: '9876543210',
      role: UserRole.MERCHANT,
    },
  })

  await prisma.user.upsert({
    where: { phone: '9123456789' },
    update: { name: 'Demo Customer' },
    create: {
      name: 'Demo Customer',
      phone: '9123456789',
      role: UserRole.CUSTOMER,
    },
  })

  await prisma.user.upsert({
    where: { phone: '9988776655' },
    update: { name: 'Rahul Kumar', role: UserRole.DELIVERY_PARTNER },
    create: {
      name: 'Rahul Kumar',
      phone: '9988776655',
      role: UserRole.DELIVERY_PARTNER,
    },
  })

  await prisma.user.upsert({
    where: { phone: '9111111111' },
    update: { name: 'Platform Admin', role: UserRole.ADMIN },
    create: {
      name: 'Platform Admin',
      phone: '9111111111',
      role: UserRole.ADMIN,
    },
  })

  console.log('🚀 Spawning production-tier marketplace assets...')

  let skuCount = 0
  for (const vendor of MARKETPLACE) {
    const shop = await prisma.shop.create({
      data: {
        name: vendor.name,
        slug: vendor.slug,
        ownerId: merchant.id,
        category: vendor.category,
        address: vendor.address,
        image: vendor.image,
        latitude: vendor.lat,
        longitude: vendor.lng,
        isActive: true,
        minOrderValue: vendor.minOrder ?? 99,
        baseDeliveryFee: vendor.fee,
        avgPrepMinutes: vendor.prep,
      },
    })

    await prisma.product.createMany({
      data: vendor.products.map((p) => ({
        shopId: shop.id,
        name: p.name,
        description: p.description,
        price: p.price,
        unit: p.unit,
        stock: p.stock ?? 80,
        isAvailable: true,
      })),
    })

    skuCount += vendor.products.length
  }

  console.log('📦 Mapping stock item matrices (SKUs) into tables...')
  console.log(
    `✨ Datastore matrix provisioned beautifully — ${MARKETPLACE.length} vendors, ${skuCount} SKUs.`,
  )
  console.log(
    '  Merchant: 9876543210 | Customer: 9123456789 | Rider: 9988776655 | Admin: 9111111111 | Dev OTP: 123456',
  )
}

main()
  .catch((e) => {
    console.error('❌ Crash triggered during database hydration execution sequence:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
