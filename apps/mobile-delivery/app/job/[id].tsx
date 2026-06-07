import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'

type Job = {
  id: string
  orderNumber: string
  shopName: string
  deliveryAddress: string
  totalPrice: number
  status: string
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    void (async () => {
      try {
        const { data } = await api.get<{ success: boolean; data: Job }>(`/rabbitor/orders/${id}`)
        setJob(data.data)
      } catch {
        setJob(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF6B35" />
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text>Job not found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{job.orderNumber}</Text>
      <Text style={styles.meta}>From {job.shopName}</Text>
      <Text style={styles.address}>{job.deliveryAddress}</Text>
      <Text style={styles.amount}>Order value ₹{job.totalPrice}</Text>
      <Pressable
        style={styles.button}
        onPress={() => router.push({ pathname: '/navigate', params: { orderId: job.id } })}
      >
        <Text style={styles.buttonText}>Navigate & deliver</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800' },
  meta: { marginTop: 8, color: '#6b7280' },
  address: { marginTop: 16, fontSize: 15, color: '#111827' },
  amount: { marginTop: 12, fontWeight: '700', color: '#16a34a' },
  button: {
    marginTop: 24,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
})
