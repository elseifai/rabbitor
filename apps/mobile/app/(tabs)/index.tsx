import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { ShopCard, type Shop } from '@/components/ShopCard'
import { Chip } from '@/components/ui/Chip'
import { ShopCardSkeleton } from '@/components/ui/Skeleton'
import { api, getErrorMessage } from '@/lib/api'
import { STORE_META } from '@/lib/theme'

const FILTERS = [
  { label: 'All', value: '', emoji: '🛍️' },
  ...Object.entries(STORE_META).map(([value, m]) => ({
    label: m.label,
    value,
    emoji: m.emoji,
  })),
]

export default function HomeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [area, setArea] = useState<string>('Locating…')

  const loadShops = useCallback(async () => {
    setError(null)
    try {
      let lat = coords?.lat
      let lng = coords?.lng

      if (lat == null || lng == null) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setArea('Set location')
          setError('Location permission is required to find nearby shops.')
          setLoading(false)
          return
        }
        const location = await Location.getCurrentPositionAsync({})
        lat = location.coords.latitude
        lng = location.coords.longitude
        setCoords({ lat, lng })
        try {
          const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
          if (place) setArea(place.name ?? place.district ?? place.city ?? 'Your location')
        } catch {
          setArea('Your location')
        }
      }

      const params: Record<string, string | number> = { lat, lng, radius: 5 }
      if (filter) params.storeType = filter

      const { data } = await api.get<{ success: boolean; data: Shop[] }>('/stores', { params })
      setShops(data.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [coords, filter])

  useEffect(() => {
    void loadShops()
  }, [loadShops])

  const onRefresh = () => {
    setRefreshing(true)
    void loadShops()
  }

  return (
    <View className="flex-1 bg-surface-subtle">
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }} className="bg-white px-4 pb-3">
        <Pressable className="flex-row items-center" onPress={() => void loadShops()}>
          <Text className="text-base">📍</Text>
          <View className="ml-1.5">
            <Text className="text-[11px] font-medium text-ink-faint">DELIVER TO</Text>
            <Text className="text-[15px] font-extrabold text-ink" numberOfLines={1}>
              {area} <Text className="text-brand">▾</Text>
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => router.push('/search')}
          className="mt-3 flex-row items-center rounded-xl border border-line bg-surface-subtle px-3.5 py-3"
        >
          <Text className="text-base text-ink-faint">🔍</Text>
          <Text className="ml-2 text-sm text-ink-faint">Search for shops & products</Text>
        </Pressable>
      </View>

      <FlatList
        data={loading ? [] : shops}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="mb-3">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1 mb-4"
              contentContainerStyle={{ paddingHorizontal: 4 }}
            >
              {FILTERS.map((f) => (
                <Chip
                  key={f.label}
                  label={f.label}
                  emoji={f.emoji}
                  active={filter === f.value}
                  onPress={() => {
                    setFilter(f.value)
                    setLoading(true)
                  }}
                />
              ))}
            </ScrollView>
            <Text className="text-lg font-extrabold text-ink">
              {filter ? STORE_META[filter]?.label : 'Shops'} near you
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <ShopCard shop={item} index={index} onPress={() => router.push(`/shop/${item.id}`)} />
        )}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 6 }).map((_, i) => (
                <ShopCardSkeleton key={i} />
              ))}
            </View>
          ) : error ? (
            <View className="mt-16 items-center px-6">
              <Text className="text-4xl">📡</Text>
              <Text className="mt-3 text-center text-sm font-medium text-ink-muted">{error}</Text>
              <Pressable
                onPress={() => {
                  setLoading(true)
                  void loadShops()
                }}
                className="mt-4 rounded-xl bg-brand px-5 py-2.5"
              >
                <Text className="font-bold text-white">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-16 items-center">
              <Text className="text-4xl">🔍</Text>
              <Text className="mt-3 text-sm font-medium text-ink-muted">No shops found nearby.</Text>
            </View>
          )
        }
      />
    </View>
  )
}
