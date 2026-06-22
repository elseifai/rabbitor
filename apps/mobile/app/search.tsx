import { useEffect, useRef, useState } from 'react'
import { FlatList, Pressable, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import { ShopCard, type Shop } from '@/components/ShopCard'
import { ShopCardSkeleton } from '@/components/ui/Skeleton'
import { api, getErrorMessage } from '@/lib/api'
import { colors } from '@/lib/theme'

export default function SearchScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const inputRef = useRef<TextInput>(null)
  const [query, setQuery] = useState('')
  const [allShops, setAllShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        let lat = 19.076
        let lng = 72.8777
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({})
          lat = loc.coords.latitude
          lng = loc.coords.longitude
        }
        const { data } = await api.get<{ success: boolean; data: Shop[] }>('/stores', {
          params: { lat, lng, radius: 8 },
        })
        setAllShops(data.data ?? [])
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
    const t = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(t)
  }, [])

  const q = query.trim().toLowerCase()
  const results = q
    ? allShops.filter(
        (s) => s.name.toLowerCase().includes(q) || s.storeType.toLowerCase().includes(q),
      )
    : allShops

  return (
    <View className="flex-1 bg-surface-subtle">
      <View style={{ paddingTop: insets.top + 8 }} className="bg-white px-4 pb-3">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="pr-3 py-1">
            <Text className="text-xl text-ink">‹</Text>
          </Pressable>
          <View className="flex-1 flex-row items-center rounded-xl border border-line bg-surface-subtle px-3">
            <Text className="text-base text-ink-faint">🔍</Text>
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search shops & products"
              placeholderTextColor={colors.inkFaint}
              className="ml-2 flex-1 py-3 text-sm text-ink"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} className="pl-2">
                <Text className="text-ink-faint">✕</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <FlatList
        data={loading ? [] : results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <ShopCard shop={item} index={index} onPress={() => router.push(`/shop/${item.id}`)} />
        )}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 5 }).map((_, i) => (
                <ShopCardSkeleton key={i} />
              ))}
            </View>
          ) : error ? (
            <Text className="mt-16 text-center text-sm text-ink-muted">{error}</Text>
          ) : (
            <View className="mt-16 items-center">
              <Text className="text-4xl">🔍</Text>
              <Text className="mt-3 text-sm font-medium text-ink-muted">
                No matches for “{query}”.
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}
