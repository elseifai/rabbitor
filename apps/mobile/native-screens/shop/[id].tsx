import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ProductCard, type Product } from '@/components/ProductCard'
import { CartBar } from '@/components/ui/CartBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { api, getErrorMessage } from '@/lib/api'
import { storeMeta, etaMinutes, colors } from '@/lib/theme'

type Store = {
  name: string
  storeType?: string
  rating?: number
  distanceKm?: number
  deliveryFee?: number
  minOrderValue?: number
}

function ProductSkeleton() {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-line bg-white p-3">
      <Skeleton className="h-[68px] w-[68px] rounded-xl" />
      <View className="ml-3 flex-1">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="mt-2 h-3 w-1/4 rounded-md" />
        <Skeleton className="mt-2 h-4 w-1/3 rounded-md" />
      </View>
      <Skeleton className="h-9 w-[72px] rounded-xl" />
    </View>
  )
}

export default function ShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [store, setStore] = useState<Store | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      const [storeRes, productsRes] = await Promise.all([
        api.get<{ success: boolean; data: Store }>(`/stores/${id}`),
        api.get<{ success: boolean; data: Product[] }>(`/stores/${id}/products`),
      ])
      setStore(storeRes.data.data)
      setProducts(productsRes.data.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const meta = storeMeta(store?.storeType)
  const q = query.trim().toLowerCase()
  const shown = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products

  return (
    <View className="flex-1 bg-surface-subtle">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 6 }} className="bg-white px-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="pr-3 py-1">
            <Text className="text-2xl text-ink">‹</Text>
          </Pressable>
          <View
            className="h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: meta.tint }}
          >
            <Text className="text-xl">{meta.emoji}</Text>
          </View>
          <View className="ml-2.5 flex-1">
            <Text className="text-[17px] font-extrabold text-ink" numberOfLines={1}>
              {store?.name ?? (loading ? 'Loading…' : 'Shop')}
            </Text>
            {store && (
              <Text className="text-xs font-medium text-ink-muted">
                ★ {(store.rating ?? 4.3).toFixed(1)} · ⚡ {etaMinutes(store.distanceKm)} mins
                {store.deliveryFee != null
                  ? ` · ${store.deliveryFee === 0 ? 'Free delivery' : `₹${store.deliveryFee} delivery`}`
                  : ''}
              </Text>
            )}
          </View>
        </View>

        <View className="mt-3 flex-row items-center rounded-xl border border-line bg-surface-subtle px-3">
          <Text className="text-base text-ink-faint">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search in this shop"
            placeholderTextColor={colors.inkFaint}
            className="ml-2 flex-1 py-2.5 text-sm text-ink"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} className="pl-2">
              <Text className="text-ink-faint">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={loading ? [] : shown}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <ProductCard product={item} shopId={id!} emoji={meta.emoji} tint={meta.tint} />
        )}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 7 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </View>
          ) : error ? (
            <View className="mt-16 items-center px-6">
              <Text className="text-4xl">📡</Text>
              <Text className="mt-3 text-center text-sm text-ink-muted">{error}</Text>
              <Pressable
                onPress={() => {
                  setLoading(true)
                  void load()
                }}
                className="mt-4 rounded-xl bg-brand px-5 py-2.5"
              >
                <Text className="font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-16 items-center">
              <Text className="text-4xl">🛒</Text>
              <Text className="mt-3 text-sm text-ink-muted">
                {q ? `No products match “${query}”.` : 'No products listed yet.'}
              </Text>
            </View>
          )
        }
      />

      <CartBar />
    </View>
  )
}
