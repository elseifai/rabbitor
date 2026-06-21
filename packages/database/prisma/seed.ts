/**
 * Rabbit — comprehensive dev seed
 *
 * Test login: OTP `123456` for all seeded phones (API uses bcrypt OtpChallenge).
 * Web dev mode also accepts `123456` after Send OTP (fixed DEV_OTP in web auth).
 * Password login (vendor/rabbitor): `rabbit123`
 */
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import {
  PrismaClient,
  UserRole,
  StoreType,
  DiscountType,
  KycStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

const TEST_OTP = '123456'
const PASSWORD = 'rabbit123'
const SALT_ROUNDS = 10

const passwordHash = bcrypt.hashSync(PASSWORD, SALT_ROUNDS)
const otpHashBcrypt = bcrypt.hashSync(TEST_OTP, SALT_ROUNDS)
const otpHashSha256 = createHash('sha256').update(TEST_OTP).digest('hex')

const WEEKLY_HOURS = {
  mon: { open: '07:00', close: '22:00' },
  tue: { open: '07:00', close: '22:00' },
  wed: { open: '07:00', close: '22:00' },
  thu: { open: '07:00', close: '22:00' },
  fri: { open: '07:00', close: '22:00' },
  sat: { open: '07:00', close: '22:00' },
  sun: { open: '07:00', close: '22:00' },
}

type ProductSeed = { name: string; price: number; unit: string; description?: string; image?: string }

type ShopSeed = {
  slug: string
  name: string
  storeType: StoreType
  category: string
  address: string
  latitude: number
  longitude: number
  image: string
  deliveryRadiusKm: number
  minOrderValue: number
  baseDeliveryFee: number
  avgPrepMinutes: number
  products: ProductSeed[]
}

const SHOPS: ShopSeed[] = [
  {
    slug: 'sharma-kirana',
    name: 'Sharma Kirana Store',
    storeType: StoreType.KIRANA,
    category: 'Kirana & Daily Essentials',
    address: 'Shop 12, SV Road, Andheri West, Mumbai',
    latitude: 19.1196,
    longitude: 72.8465,
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 100,
    baseDeliveryFee: 20,
    avgPrepMinutes: 10,
    products: [
      { name: 'Tata Salt 1kg', price: 22, unit: '1 kg', image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=300&q=80' },
      { name: 'Aashirvaad Atta 5kg', price: 260, unit: '5 kg', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&q=80' },
      { name: 'Amul Butter 500g', price: 280, unit: '500 g', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&q=80' },
      { name: 'Fortune Sunflower Oil 1L', price: 140, unit: '1 L', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=80' },
      { name: 'Parle-G Biscuits', price: 10, unit: '1 pack', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&q=80' },
      { name: 'Maggi Noodles 4pack', price: 68, unit: '4 pack', image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=300&q=80' },
      { name: 'Ariel Detergent 1kg', price: 185, unit: '1 kg', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&q=80' },
      { name: 'Colgate Toothpaste', price: 65, unit: '1 tube', image: 'https://images.unsplash.com/photo-1559591937-abc2e768b6e5?w=300&q=80' },
      { name: 'Lays Chips', price: 20, unit: '1 pack', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&q=80' },
      { name: 'Red Label Tea 250g', price: 115, unit: '250 g', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80' },
    ],
  },
  {
    slug: 'masoli-fish',
    name: 'Masoli Fish Centre',
    storeType: StoreType.FISH,
    category: 'Fresh Fish & Seafood',
    address: 'Fish Market Lane, Versova, Mumbai',
    latitude: 19.121,
    longitude: 72.848,
    image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 200,
    baseDeliveryFee: 30,
    avgPrepMinutes: 15,
    products: [
      { name: 'Rohu Fish 1kg', price: 220, unit: '1 kg', image: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=300&q=80' },
      { name: 'Pomfret 500g', price: 320, unit: '500 g', image: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=300&q=80' },
      { name: 'Prawns 500g', price: 380, unit: '500 g', image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=300&q=80' },
      { name: 'Surmai 1kg', price: 480, unit: '1 kg', image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=300&q=80' },
      { name: 'Bangda 1kg', price: 180, unit: '1 kg', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&q=80' },
      { name: 'Hilsa 500g', price: 420, unit: '500 g', image: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=300&q=80' },
      { name: 'Crab 1kg', price: 550, unit: '1 kg', image: 'https://images.unsplash.com/photo-1550950158-d0d960dff596?w=300&q=80' },
      { name: 'Squid 500g', price: 280, unit: '500 g', image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=300&q=80' },
    ],
  },
  {
    slug: 'priya-veggies',
    name: 'Priya Fresh Vegetables',
    storeType: StoreType.VEGETABLE,
    category: 'Fresh Vegetables',
    address: 'Vegetable Mandi, Lokhandwala, Mumbai',
    latitude: 19.118,
    longitude: 72.845,
    image: 'https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 80,
    baseDeliveryFee: 15,
    avgPrepMinutes: 8,
    products: [
      { name: 'Tomato 1kg', price: 40, unit: '1 kg', image: 'https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=300&q=80' },
      { name: 'Potato 1kg', price: 35, unit: '1 kg', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=300&q=80' },
      { name: 'Onion 1kg', price: 50, unit: '1 kg', image: 'https://images.unsplash.com/photo-1580201092675-a0a6a6cafbb1?w=300&q=80' },
      { name: 'Spinach 500g', price: 25, unit: '500 g', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=300&q=80' },
      { name: 'Capsicum 500g', price: 60, unit: '500 g', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=300&q=80' },
      { name: 'Carrot 1kg', price: 55, unit: '1 kg', image: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=300&q=80' },
      { name: 'Cucumber 1kg', price: 30, unit: '1 kg', image: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=300&q=80' },
      { name: 'Bitter Gourd 500g', price: 45, unit: '500 g', image: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=300&q=80' },
      { name: 'Lemon 6pcs', price: 20, unit: '6 pcs', image: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=300&q=80' },
    ],
  },
  {
    slug: 'city-pharmacy',
    name: 'City Pharmacy Plus',
    storeType: StoreType.PHARMACY,
    category: 'Pharmacy & Wellness',
    address: 'Near Station, Andheri West, Mumbai',
    latitude: 19.117,
    longitude: 72.844,
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 50,
    baseDeliveryFee: 10,
    avgPrepMinutes: 5,
    products: [
      { name: 'Paracetamol 500mg strip', price: 25, unit: '1 strip', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80' },
      { name: 'Dettol 250ml', price: 115, unit: '250 ml', image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=300&q=80' },
      { name: 'Band-Aid box', price: 85, unit: '1 box', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=300&q=80' },
      { name: 'ORS Sachet 5pcs', price: 45, unit: '5 pcs', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&q=80' },
      { name: 'Vitamin C tablets', price: 180, unit: '1 bottle', image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=300&q=80' },
      { name: 'Glucon-D 200g', price: 95, unit: '200 g', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&q=80' },
    ],
  },
  {
    slug: 'mumbai-bakery',
    name: 'Mumbai Bakery House',
    storeType: StoreType.BAKERY,
    category: 'Bakery & Sweets',
    address: 'Linking Road, Bandra, Mumbai',
    latitude: 19.1188,
    longitude: 72.846,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 100,
    baseDeliveryFee: 20,
    avgPrepMinutes: 12,
    products: [
      { name: 'Bread Loaf', price: 45, unit: '1 loaf', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&q=80' },
      { name: 'Butter Croissant', price: 35, unit: '1 pc', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&q=80' },
      { name: 'Chocolate Cake', price: 380, unit: '500 g', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&q=80' },
      { name: 'Pav (6pcs)', price: 25, unit: '6 pcs', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=300&q=80' },
      { name: 'Cookies Box', price: 120, unit: '1 box', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=300&q=80' },
      { name: 'Muffin', price: 40, unit: '1 pc', image: 'https://images.unsplash.com/photo-1558303237-9bdc6c1f1edd?w=300&q=80' },
    ],
  },
  {
    slug: 'om-dairy',
    name: 'Om Dairy Fresh',
    storeType: StoreType.DAIRY,
    category: 'Dairy & Milk Products',
    address: 'DN Nagar, Andheri West, Mumbai',
    latitude: 19.12,
    longitude: 72.847,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 80,
    baseDeliveryFee: 15,
    avgPrepMinutes: 10,
    products: [
      { name: 'Full Cream Milk 1L', price: 68, unit: '1 L', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&q=80' },
      { name: 'Paneer 200g', price: 89, unit: '200 g', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300&q=80' },
      { name: 'Dahi 400g', price: 45, unit: '400 g', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300&q=80' },
      { name: 'Ghee 500ml', price: 320, unit: '500 ml', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&q=80' },
      { name: 'Curd 1kg', price: 95, unit: '1 kg', image: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?w=300&q=80' },
      { name: 'Lassi 200ml', price: 30, unit: '200 ml', image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=300&q=80' },
    ],
  },
  {
    slug: 'quick-mart',
    name: 'Quick Mart General',
    storeType: StoreType.GENERAL,
    category: 'General Store',
    address: 'Versova, Andheri, Mumbai',
    latitude: 19.1215,
    longitude: 72.849,
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=400',
    deliveryRadiusKm: 15,
    minOrderValue: 50,
    baseDeliveryFee: 20,
    avgPrepMinutes: 8,
    products: [
      { name: 'Mineral Water 1L', price: 20, unit: '1 L', image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&q=80' },
      { name: 'Notebook', price: 45, unit: '1 pc', image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80' },
      { name: 'Pen Set', price: 30, unit: '1 set', image: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=300&q=80' },
      { name: 'Matchbox', price: 5, unit: '1 box', image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=300&q=80' },
      { name: 'Candles 10pcs', price: 35, unit: '10 pcs', image: 'https://images.unsplash.com/photo-1602607767773-a73c903a3d7b?w=300&q=80' },
      { name: 'Tissue Box', price: 99, unit: '1 box', image: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=300&q=80' },
    ],
  },
]

const TEST_PHONES = [
  '9000000000',
  '9111111111',
  '9222222222',
  '9333333333',
  '9444444444',
  '9555555555',
  '9666666666',
  '9777777777',
  '9888888888',
]

async function purge() {
  await prisma.paymentIntent.deleteMany()
  await prisma.orderStatusEvent.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.platformSettings.deleteMany()
  await prisma.review.deleteMany()
  await prisma.ad.deleteMany()
  await prisma.kycDocument.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.otpChallenge.deleteMany()
  await prisma.emailVerification.deleteMany()
  await prisma.customerAddress.deleteMany()
  await prisma.product.deleteMany()
  await prisma.shop.deleteMany()
  await prisma.masterCatalogItem.deleteMany()
  await prisma.vendorProfile.deleteMany()
  await prisma.rabbitorProfile.deleteMany()
  await prisma.user.deleteMany()
}

async function seedOtpChallenges() {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  for (const phone of TEST_PHONES) {
    await prisma.otpChallenge.create({
      data: { phone, codeHash: otpHashBcrypt, expiresAt, verified: false },
    })
    await prisma.otpChallenge.create({
      data: { phone, codeHash: otpHashSha256, expiresAt, verified: false },
    })
  }
}

async function main() {
  console.log('🧹 Clearing existing data…')
  await purge()

  console.log('👤 Creating users…')
  const admin = await prisma.user.create({
    data: {
      name: 'Rahul Admin',
      phone: '9000000000',
      email: 'dreamsight11@gmail.com',
      emailVerified: new Date(),
      role: UserRole.ADMIN,
      passwordHash,
      displayName: 'Rahul Admin',
    },
  })

  const vendorRamesh = await prisma.user.create({
    data: {
      name: 'Ramesh Sharma',
      phone: '9111111111',
      role: UserRole.VENDOR,
      passwordHash,
      displayName: 'Ramesh Sharma',
      vendorProfile: {
        create: {
          businessName: 'Sharma Kirana Store',
          kycStatus: KycStatus.VERIFIED,
          subscriptionTier: 'SILVER',
        },
      },
    },
    include: { vendorProfile: true },
  })

  const vendorAbdul = await prisma.user.create({
    data: {
      name: 'Abdul Fish',
      phone: '9222222222',
      role: UserRole.VENDOR,
      passwordHash,
      displayName: 'Abdul Fish',
      vendorProfile: {
        create: {
          businessName: 'Masoli Fish Centre',
          kycStatus: KycStatus.VERIFIED,
        },
      },
    },
    include: { vendorProfile: true },
  })

  const vendorPriya = await prisma.user.create({
    data: {
      name: 'Priya Veggies',
      phone: '9333333333',
      role: UserRole.VENDOR,
      passwordHash,
      displayName: 'Priya Veggies',
      vendorProfile: {
        create: {
          businessName: 'Priya Fresh Vegetables',
          kycStatus: KycStatus.VERIFIED,
        },
      },
    },
    include: { vendorProfile: true },
  })

  await prisma.user.create({
    data: {
      name: 'Suresh Kumar',
      phone: '9444444444',
      role: UserRole.RABBITOR,
      passwordHash,
      displayName: 'Suresh Kumar',
      rabbitorProfile: {
        create: {
          isAvailable: true,
          isVerified: true,
          isOnboarded: true,
          currentLat: 19.076,
          currentLng: 72.877,
        },
      },
    },
  })

  await prisma.user.create({
    data: {
      name: 'Mohan Delivery',
      phone: '9555555555',
      role: UserRole.RABBITOR,
      passwordHash,
      displayName: 'Mohan Delivery',
      rabbitorProfile: {
        create: {
          isAvailable: true,
          isVerified: true,
          isOnboarded: true,
          currentLat: 19.079,
          currentLng: 72.88,
        },
      },
    },
  })

  await prisma.user.create({
    data: {
      name: 'Aarav Patel',
      phone: '9666666666',
      role: UserRole.CUSTOMER,
      displayName: 'Aarav Patel',
    },
  })

  await prisma.user.create({
    data: {
      name: 'Sneha Joshi',
      phone: '9777777777',
      role: UserRole.CUSTOMER,
      displayName: 'Sneha Joshi',
    },
  })

  await prisma.user.create({
    data: {
      name: 'Kiran Mehta',
      phone: '9888888888',
      role: UserRole.CUSTOMER,
      displayName: 'Kiran Mehta',
    },
  })

  console.log('🏪 Creating shops & products…')
  const vendorMap: Record<string, { userId: string; vendorId: string }> = {
    'sharma-kirana': {
      userId: vendorRamesh.id,
      vendorId: vendorRamesh.vendorProfile!.id,
    },
    'masoli-fish': {
      userId: vendorAbdul.id,
      vendorId: vendorAbdul.vendorProfile!.id,
    },
    'priya-veggies': {
      userId: vendorPriya.id,
      vendorId: vendorPriya.vendorProfile!.id,
    },
    'city-pharmacy': {
      userId: vendorRamesh.id,
      vendorId: vendorRamesh.vendorProfile!.id,
    },
    'mumbai-bakery': {
      userId: vendorRamesh.id,
      vendorId: vendorRamesh.vendorProfile!.id,
    },
    'om-dairy': {
      userId: vendorPriya.id,
      vendorId: vendorPriya.vendorProfile!.id,
    },
    'quick-mart': {
      userId: vendorRamesh.id,
      vendorId: vendorRamesh.vendorProfile!.id,
    },
  }

  let productCount = 0
  for (const [shopIndex, shop] of SHOPS.entries()) {
    const owner = vendorMap[shop.slug]
    // Deterministic but varied rating between 3.9 and 4.8, and a realistic count
    const ratingAvg = Math.round((3.9 + ((shopIndex * 37) % 10) / 11) * 10) / 10
    const ratingCount = 40 + ((shopIndex * 53) % 260)
    await prisma.shop.create({
      data: {
        name: shop.name,
        slug: shop.slug,
        storeType: shop.storeType,
        category: shop.category,
        address: shop.address,
        latitude: shop.latitude,
        longitude: shop.longitude,
        image: shop.image,
        isActive: true,
        deliveryRadiusKm: shop.deliveryRadiusKm,
        minOrderValue: shop.minOrderValue,
        baseDeliveryFee: shop.baseDeliveryFee,
        avgPrepMinutes: shop.avgPrepMinutes,
        ratingAvg,
        ratingCount,
        openingHours: WEEKLY_HOURS,
        ownerId: owner.userId,
        vendorId: owner.vendorId,
        products: {
          create: shop.products.map((p, i) => {
            // MRP 12–35% above selling price, deterministic per product
            const markup = 1.12 + (((i * 17) % 24) / 100)
            const mrp = Math.round(p.price * markup)
            return {
              name: p.name,
              description: p.description ?? `${p.name} — fresh from ${shop.name}`,
              price: p.price,
              mrp: mrp > p.price ? mrp : null,
              unit: p.unit,
              image: p.image,
              stock: 100,
              isAvailable: true,
            }
          }),
        },
      },
    })
    productCount += shop.products.length
  }

  console.log('⚙️  Platform settings…')
  await prisma.platformSettings.create({
    data: {
      id: 'default',
      globalMinCartValue: 0,
      multiShopRoutingFeePerLeg: 25,
      freeDeliveryThreshold: 499,
    },
  })

  console.log('🧪 Sandbox test product (₹1)…')
  const kiranaShop = await prisma.shop.findUnique({ where: { slug: 'sharma-kirana' } })
  if (kiranaShop) {
    await prisma.product.upsert({
      where: {
        id: `${kiranaShop.id}-sandbox-test`,
      },
      create: {
        id: `${kiranaShop.id}-sandbox-test`,
        shopId: kiranaShop.id,
        name: 'Testing Sandbox Product',
        description: '₹1 Razorpay checkout test item',
        price: 1,
        mrp: 5,
        unit: 'piece',
        stock: 999,
        isAvailable: true,
        category: 'general',
      },
      update: {
        price: 1,
        isAvailable: true,
        stock: 999,
      },
    })
    productCount += 1
  }

  console.log('🎟️ Creating coupons…')
  await prisma.coupon.createMany({
    data: [
      {
        code: 'WELCOME50',
        discountType: DiscountType.FLAT,
        discountValue: 50,
        minOrderValue: 199,
        maxUses: 1000,
        isActive: true,
      },
      {
        code: 'RABBIT20',
        discountType: DiscountType.PERCENT,
        discountValue: 20,
        minOrderValue: 299,
        maxUses: 500,
        isActive: true,
      },
      {
        code: 'FISH100',
        discountType: DiscountType.FLAT,
        discountValue: 100,
        minOrderValue: 400,
        maxUses: 200,
        isActive: true,
      },
    ],
  })

  console.log('📢 Creating ads…')
  await prisma.ad.deleteMany()
  await prisma.ad.createMany({
    data: [
      {
        title: 'Welcome Offer',
        placement: 'HOME_BANNER',
        imageUrl:
          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
        linkUrl: '/shops',
        isActive: true,
      },
      {
        title: 'Fresh Fish Today',
        placement: 'SHOP_PAGE',
        imageUrl:
          'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&q=80',
        linkUrl: '/shops?category=fish',
        isActive: true,
      },
      {
        title: 'Free Delivery',
        placement: 'HOME_STRIP',
        imageUrl:
          'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?w=800&q=80',
        linkUrl: '/shops',
        isActive: true,
      },
    ],
  })

  console.log('🔐 Seeding OTP challenges (123456)…')
  await seedOtpChallenges()

  console.log('📦 Creating master catalog templates…')
  const masterCatalogItems = [
    { storeType: StoreType.KIRANA, name: 'Maggi 2-Minute Noodles', segmentSlug: 'instant', basePrice: 14, defaultUnit: '70g pack' },
    { storeType: StoreType.KIRANA, name: 'Tata Salt 1kg', segmentSlug: 'staples', basePrice: 28, defaultUnit: '1 kg' },
    { storeType: StoreType.KIRANA, name: 'Fortune Sunflower Oil 1L', segmentSlug: 'oils', basePrice: 145, defaultUnit: '1 L' },
    { storeType: StoreType.FISH, name: 'Surmai (Kingfish)', segmentSlug: 'premium', basePrice: 650, defaultUnit: '500g' },
    { storeType: StoreType.FISH, name: 'Jumbo Prawns', segmentSlug: 'shellfish', basePrice: 480, defaultUnit: '500g' },
    { storeType: StoreType.VEGETABLE, name: 'Tomato (Tamatar)', segmentSlug: 'vegetables', basePrice: 40, defaultUnit: '1 kg' },
    { storeType: StoreType.VEGETABLE, name: 'Onion (Pyaz)', segmentSlug: 'vegetables', basePrice: 35, defaultUnit: '1 kg' },
    { storeType: StoreType.PHARMACY, name: 'Paracetamol 500mg', segmentSlug: 'otc', basePrice: 25, defaultUnit: 'strip of 15' },
    { storeType: StoreType.BAKERY, name: 'Pav Bread', segmentSlug: 'bread', basePrice: 30, defaultUnit: '6 pcs' },
    { storeType: StoreType.DAIRY, name: 'Amul Taaza Milk', segmentSlug: 'milk', basePrice: 58, defaultUnit: '1L pouch' },
    { storeType: StoreType.MEAT, name: 'Chicken Curry Cut', segmentSlug: 'poultry', basePrice: 220, defaultUnit: '1 kg' },
    { storeType: StoreType.GENERAL, name: 'Bisleri Water', segmentSlug: 'beverages', basePrice: 20, defaultUnit: '1L bottle' },
  ]
  await prisma.masterCatalogItem.createMany({ data: masterCatalogItems })

  console.log('')
  console.log('✅ Seed complete!')
  console.log(`   Admin:     ${admin.phone}`)
  console.log(`   Shops:     ${SHOPS.length} | Products: ${productCount} | Master catalog: ${masterCatalogItems.length} | Coupons: 3`)
  console.log('   OTP:       123456 (all test phones)')
  console.log('   Password:  rabbit123 (admin, vendors, rabbitors)')
  console.log('')
  console.log('   Customer:  9666666666 | Merchant (Kirana): 9111111111')
  console.log('   Merchant (Fish): 9222222222 | Rabbitor: 9444444444')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
