import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { api, getErrorMessage } from '@/lib/api'

type Order = {
  id: string
  orderNumber: string
  storeName: string
  status: string
  totalPrice: number
  createdAt: string
}

const ACTIVE = ['PENDING', 'ACCEPTED_BY_SHOP', 'PREPARING', 'OUT_FOR_DELIVERY']

function OrderSkeleton() {
  return (
    <View className="mb-3 rounded-2xl border border-line bg-white p-4">
      <Skeleton className="h-4 w-1/3 rounded-md" />
      <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
      <Skeleton className="mt-3 h-4 w-1/4 rounded-md" />
    </View>
  )
}

export default function OrdersScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { data } = await api.get<{ success: boolean; data: { orders: Order[] } }>('/orders')
      setOrders(data.data.orders ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  return (
    <View className="flex-1 bg-surface-subtle">
      <View style={{ paddingTop: insets.top + 8 }} className="bg-white px-4 pb-3">
        <Text className="text-xl font-extrabold text-ink">Your orders</Text>
      </View>

      <FlatList
        data={loading ? [] : orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
          />
        }
        renderItem={({ item }) => {
          const active = ACTIVE.includes(item.status)
          return (
            <Pressable
              onPress={() => router.push(`/track/${item.id}`)}
              className="mb-3 rounded-2xl border border-line bg-white p-4 active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-extrabold text-ink">#{item.orderNumber}</Text>
                <OrderStatusBadge status={item.status} />
              </View>
              <Text className="mt-1.5 text-sm text-ink-muted" numberOfLines={1}>
                {item.storeName}
              </Text>
              <View className="mt-2.5 flex-row items-center justify-between">
                <Text className="text-base font-extrabold text-ink">₹{item.totalPrice}</Text>
                <Text className={`text-sm font-bold ${active ? 'text-brand' : 'text-ink-faint'}`}>
                  {active ? 'Track order →' : 'View →'}
                </Text>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 5 }).map((_, i) => (
                <OrderSkeleton key={i} />
              ))}
            </View>
          ) : error ? (
            <Text className="mt-16 text-center text-sm text-ink-muted">{error}</Text>
          ) : (
            <View className="mt-20 items-center">
              <Text className="text-5xl">🧾</Text>
              <Text className="mt-4 text-base font-bold text-ink">No orders yet</Text>
              <Text className="mt-1 text-sm text-ink-muted">Your orders will show up here.</Text>
              <Pressable
                onPress={() => router.replace('/(tabs)')}
                className="mt-6 rounded-xl bg-brand px-6 py-3"
              >
                <Text className="font-bold text-white">Start shopping</Text>
              </Pressable>
            </View>
          )
        }
      />
    </View>
  )
}
