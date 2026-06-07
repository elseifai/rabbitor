import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { ShopCard } from '@/components/ShopCard'
import { api, getErrorMessage } from '@/lib/api'

type Shop = {
  id: string
  name: string
  storeType: string
  distanceKm?: number
  deliveryFee: number
  minOrderValue: number
  isOpen: boolean
}

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Kirana', value: 'KIRANA' },
  { label: 'Fish', value: 'FISH' },
  { label: 'Vegetables', value: 'VEGETABLE' },
  { label: 'Pharmacy', value: 'PHARMACY' },
] as const

export default function HomeScreen() {
  const router = useRouter()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  const loadShops = useCallback(async () => {
    setError(null)
    try {
      let lat = coords?.lat
      let lng = coords?.lng

      if (lat == null || lng == null) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setError('Location permission is required to find nearby shops.')
          setLoading(false)
          return
        }
        const location = await Location.getCurrentPositionAsync({})
        lat = location.coords.latitude
        lng = location.coords.longitude
        setCoords({ lat, lng })
      }

      const params: Record<string, string | number> = {
        lat,
        lng,
        radius: 5,
      }
      if (filter) params.storeType = filter

      const { data } = await api.get<{ success: boolean; data: Shop[] }>('/stores', { params })
      setShops(data.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [coords, filter])

  useEffect(() => {
    void loadShops()
  }, [loadShops])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shops near you</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.label}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => {
              setFilter(f.value)
              setLoading(true)
            }}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={shops}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadShops()} />}
          renderItem={({ item }) => (
            <ShopCard shop={item} onPress={() => router.push(`/shop/${item.id}`)} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No shops found nearby.</Text>}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  filters: { marginBottom: 12, maxHeight: 44 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  chipTextActive: { color: '#fff' },
  error: { color: '#ef4444', marginTop: 20, textAlign: 'center' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
})
