import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { api, getErrorMessage } from '@/lib/api'

type Order = {
  id: string
  orderNumber: string
  storeName: string
  status: string
  totalPrice: number
  createdAt: string
}

export default function OrdersScreen() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<{ success: boolean; data: { orders: Order[] } }>('/orders')
      setOrders(data.data.orders ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/track/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.number}>{item.orderNumber}</Text>
              <OrderStatusBadge status={item.status} />
            </View>
            <Text style={styles.store}>{item.storeName}</Text>
            <Text style={styles.total}>₹{item.totalPrice}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ef4444', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontWeight: '700', color: '#111827' },
  store: { marginTop: 6, color: '#6b7280' },
  total: { marginTop: 4, fontWeight: '700', color: '#16a34a' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
})
