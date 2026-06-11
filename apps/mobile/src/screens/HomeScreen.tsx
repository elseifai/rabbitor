import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ShopCard } from '@/components/ShopCard'
import { api, getErrorMessage } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { SubPlatformTabs } from '@/src/components/navigation/SubPlatformTabs'
import { RotatingSearchBar } from '@/src/components/navigation/RotatingSearchBar'
import {
  UnifiedProductCard,
  type UnifiedProduct,
} from '@/src/components/products/UnifiedProductCard'
import {
  FASHION_DEAL_BADGES,
  SUB_PLATFORM_CONFIG,
  type SubPlatformId,
} from '@/src/lib/sub-platforms'

type Shop = {
  id: string
  name: string
  storeType: string
  distanceKm?: number
  deliveryFee: number
  minOrderValue: number
  isOpen: boolean
}

type ApiProduct = {
  id: string
  name: string
  price: number
  unit?: string | null
  image?: string | null
  mrp?: number | null
  stock?: number
}

type FeedRow =
  | { key: string; kind: 'fashion-badges' }
  | { key: string; kind: 'grocery-categories' }
  | { key: string; kind: 'product-row'; left: UnifiedProduct; right?: UnifiedProduct }

type FeedSection = {
  key: string
  title: string
  subtitle?: string
  data: FeedRow[]
}

const FASHION_FALLBACK: UnifiedProduct[] = [
  {
    id: 'fashion-1',
    name: 'Urban Runner Sneakers',
    unit: 'UK 6-11',
    price: 549,
    mrp: 1299,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    storeType: 'GENERAL',
    optionCount: 5,
    sizes: ['7', '8', '9', '10'],
    colors: ['White'],
  },
  {
    id: 'fashion-2',
    name: 'Linen Casual Shirt',
    unit: 'S-XXL',
    price: 499,
    mrp: 999,
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    storeType: 'GENERAL',
    optionCount: 4,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Navy'],
  },
  {
    id: 'fashion-3',
    name: 'High-Rise Slim Jeans',
    unit: '28-36',
    price: 599,
    mrp: 1499,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    storeType: 'GENERAL',
    optionCount: 6,
    sizes: ['28', '30', '32', '34'],
    colors: ['Blue'],
  },
  {
    id: 'fashion-4',
    name: 'Everyday Tote Bag',
    unit: 'One Size',
    price: 399,
    mrp: 799,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400',
    shopId: 'boutique-hub',
    shopName: 'Boutique Hub',
    storeType: 'GENERAL',
    optionCount: 3,
    colors: ['Tan'],
  },
]

const GROCERY_CATEGORIES = [
  { label: 'Fruits & Veggies', emoji: '🥦' },
  { label: 'Dairy & Bread', emoji: '🥛' },
  { label: 'Snacks', emoji: '🍿' },
  { label: 'Beverages', emoji: '🥤' },
  { label: 'Masala', emoji: '🌶️' },
  { label: 'Frozen', emoji: '🧊' },
]

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size))
  }
  return rows
}

function FashionBadgesRow() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
      {FASHION_DEAL_BADGES.map((badge) => (
        <View key={badge.label} style={styles.badge}>
          <View style={styles.badgeTagWrap}>
            <Text style={styles.badgeTag}>{badge.tag}</Text>
          </View>
          <Text style={styles.badgeLabel}>{badge.label}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

function GroceryCategoriesRow() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgeScroll}>
      {GROCERY_CATEGORIES.map((cat) => (
        <View key={cat.label} style={styles.categoryChip}>
          <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
          <Text style={styles.categoryLabel}>{cat.label}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

export function HomeScreen() {
  const router = useRouter()
  const cartCount = useCartStore((s) => s.itemCount())
  const [subPlatform, setSubPlatform] = useState<SubPlatformId>('all')
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<UnifiedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const platformConfig = SUB_PLATFORM_CONFIG[subPlatform]

  const loadFeed = useCallback(async () => {
    setError(null)
    try {
      let lat = coords?.lat
      let lng = coords?.lng

      if (lat == null || lng == null) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setError('Location permission is required to find nearby shops.')
          return
        }
        const location = await Location.getCurrentPositionAsync({})
        lat = location.coords.latitude
        lng = location.coords.longitude
        setCoords({ lat, lng })
      }

      const { data: storesRes } = await api.get<{ success: boolean; data: Shop[] }>('/stores', {
        params: { lat, lng, radius: 8 },
      })
      const nearby = storesRes.data ?? []
      setShops(nearby)

      const sampleStores = nearby.slice(0, 4)
      const productBatches = await Promise.all(
        sampleStores.map(async (store) => {
          try {
            const { data } = await api.get<{ success: boolean; data: ApiProduct[] }>(
              `/stores/${store.id}/products`,
            )
            return (data.data ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              mrp: p.mrp,
              unit: p.unit ?? undefined,
              image: p.image,
              shopId: store.id,
              shopName: store.name,
              storeType: store.storeType,
              stock: p.stock,
              optionCount: 4,
              sizes: ['S', 'M', 'L', 'XL'],
              colors: ['Black', 'Navy'],
            }))
          } catch {
            return [] as UnifiedProduct[]
          }
        }),
      )

      setProducts(productBatches.flat())
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [coords])

  useEffect(() => {
    void loadFeed()
  }, [loadFeed])

  const platformProducts = useMemo(() => {
    let list = products
    if (platformConfig.storeTypes?.length) {
      list = list.filter(
        (p) => !p.storeType || platformConfig.storeTypes!.includes(p.storeType),
      )
    }
    if (subPlatform === 'fashion') {
      const merged = [...FASHION_FALLBACK, ...list]
      const seen = new Set<string>()
      return merged.filter((item) => {
        if (seen.has(item.id)) return false
        seen.add(item.id)
        return true
      })
    }
    return list
  }, [products, platformConfig.storeTypes, subPlatform])

  const sections = useMemo((): FeedSection[] => {
    const result: FeedSection[] = []

    if (platformConfig.showFashionDeals) {
      result.push({
        key: 'fashion',
        title: 'Fashion Deals: Everything Under ₹599',
        subtitle: 'Same-day style drops from local boutiques',
        data: [{ key: 'fashion-badges', kind: 'fashion-badges' }],
      })
    }

    if (platformConfig.showGroceryLayouts) {
      result.push({
        key: 'grocery',
        title: 'Grocery & Kitchen',
        subtitle: 'Daily essentials from neighbourhood stores',
        data: [{ key: 'grocery-categories', kind: 'grocery-categories' }],
      })
    }

    const productRows: FeedRow[] = chunk(platformProducts, 2).map((pair, index) => ({
      key: `product-row-${index}`,
      kind: 'product-row' as const,
      left: pair[0],
      right: pair[1],
    }))

    if (productRows.length > 0) {
      result.push({
        key: 'deals',
        title:
          subPlatform === 'fashion'
            ? 'Boutique Picks: Under ₹599'
            : 'Flash Deals: All Time Low',
        subtitle:
          subPlatform === 'fashion'
            ? 'Curated apparel, footwear & accessories'
            : 'Fresh essentials every day',
        data: productRows,
      })
    }

    return result
  }, [platformConfig, platformProducts, subPlatform])

  const renderFeedRow = ({ item }: { item: FeedRow }) => {
    if (item.kind === 'fashion-badges') return <FashionBadgesRow />
    if (item.kind === 'grocery-categories') return <GroceryCategoriesRow />
    return (
      <View style={styles.productRow}>
        <UnifiedProductCard
          product={item.left}
          variant={platformConfig.productVariant}
          style={styles.productCell}
        />
        {item.right ? (
          <UnifiedProductCard
            product={item.right}
            variant={platformConfig.productVariant}
            style={styles.productCell}
          />
        ) : (
          <View style={styles.productCell} />
        )}
      </View>
    )
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.searchRow}>
        <RotatingSearchBar />
        <View
          style={[
            styles.etaPill,
            { backgroundColor: platformConfig.etaBg },
          ]}
        >
          <Text style={[styles.etaText, { color: platformConfig.etaText }]}>
            {platformConfig.etaLabel}
          </Text>
        </View>
      </View>
      <SubPlatformTabs activeTab={subPlatform} onChange={setSubPlatform} />
    </View>
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.stickyHeader}>{listHeader}</View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void loadFeed()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          renderItem={renderFeedRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.subtitle ? (
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              ) : null}
            </View>
          )}
          ListFooterComponent={
            <View style={styles.shopsSection}>
              <Text style={styles.sectionTitle}>Stores near you</Text>
              <Text style={styles.sectionSubtitle}>
                {subPlatform === 'fashion'
                  ? 'Same-day delivery available'
                  : 'Delivering in 15-30 mins'}
              </Text>
              {shops.length === 0 ? (
                <Text style={styles.empty}>No shops found nearby.</Text>
              ) : (
                shops.map((shop) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    onPress={() => router.push(`/shop/${shop.id}`)}
                  />
                ))
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadFeed()
              }}
              tintColor="#FF6B35"
            />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
        />
      )}

      {cartCount > 0 && (
        <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
          <Text style={styles.cartBarText}>View cart ({cartCount}) →</Text>
        </Pressable>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F0F0' },
  stickyHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 4,
  },
  headerBlock: { paddingTop: 8 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  etaPill: {
    width: '38%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  etaText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  listContent: { paddingBottom: 100 },
  sectionHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1C' },
  sectionSubtitle: { fontSize: 12, color: '#878787', marginTop: 2 },
  badgeScroll: { paddingHorizontal: 16, paddingVertical: 8 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FBCFE8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  badgeTagWrap: {
    backgroundColor: '#1C1C1C',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTag: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  badgeLabel: { fontSize: 12, fontWeight: '700', color: '#1C1C1C' },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    minWidth: 88,
  },
  categoryEmoji: { fontSize: 22, marginBottom: 4 },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: '#1C1C1C', textAlign: 'center' },
  productRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  productCell: { flex: 1 },
  shopsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
    gap: 8,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  empty: { color: '#9ca3af', marginTop: 12 },
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#FF3F6C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cartBarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
})
