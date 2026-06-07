import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'

type Job = {
  id: string
  orderNumber: string
  shopName: string
  deliveryAddress: string
  totalPrice: number
  status: string
}

export default function JobsScreen() {
  const router = useRouter()
  const [available, setAvailable] = useState(true)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const { data } = await api.get<{ success: boolean; data: Job[] }>('/rabbitor/orders')
      setJobs(data.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const toggleAvailability = async (value: boolean) => {
    setAvailable(value)
    try {
      await api.patch('/rabbitor/availability', { isAvailable: value })
    } catch (err) {
      setAvailable(!value)
      setError(getErrorMessage(err))
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.availability}>
        <Text style={styles.availabilityLabel}>I'm Available</Text>
        <Switch value={available} onValueChange={(v) => void toggleAvailability(v)} />
      </View>

      <Pressable style={styles.earningsLink} onPress={() => router.push('/earnings')}>
        <Text style={styles.earningsText}>View earnings →</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadJobs()} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <Text style={styles.shop}>{item.shopName}</Text>
              <Text style={styles.address}>{item.deliveryAddress}</Text>
              <Text style={styles.amount}>₹{item.totalPrice}</Text>
              <Pressable
                style={styles.acceptBtn}
                onPress={() => router.push({ pathname: '/navigate', params: { orderId: item.id } })}
              >
                <Text style={styles.acceptText}>Start delivery</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No assigned jobs right now.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  availability: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  availabilityLabel: { fontWeight: '700', fontSize: 16 },
  earningsLink: { marginBottom: 12 },
  earningsText: { color: '#FF6B35', fontWeight: '700' },
  error: { color: '#ef4444', marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderNumber: { fontWeight: '800', fontSize: 16 },
  shop: { marginTop: 4, color: '#374151', fontWeight: '600' },
  address: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  amount: { marginTop: 8, fontWeight: '700', color: '#16a34a' },
  acceptBtn: {
    marginTop: 12,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontWeight: '700' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
})
