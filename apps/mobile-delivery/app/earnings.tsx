import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { api, getErrorMessage } from '@/lib/api'

type EarningOrder = {
  id: string
  orderNumber: string
  amount: number
  deliveredAt: string | null
}

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [orders, setOrders] = useState<EarningOrder[]>([])

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{
          success: boolean
          data: { totalEarnings: number; orders: EarningOrder[] }
        }>('/rabbitor/earnings')
        setTotalEarnings(data.data.totalEarnings)
        setOrders(data.data.orders)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.totalLabel}>Total earnings</Text>
      <Text style={styles.total}>₹{totalEarnings}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.order}>{item.orderNumber}</Text>
              {item.deliveredAt && (
                <Text style={styles.date}>{new Date(item.deliveredAt).toLocaleDateString()}</Text>
              )}
            </View>
            <Text style={styles.amount}>₹{item.amount}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No completed deliveries yet.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  totalLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  total: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 16 },
  error: { color: '#ef4444', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  order: { fontWeight: '700' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  amount: { fontWeight: '700', color: '#16a34a' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
})
