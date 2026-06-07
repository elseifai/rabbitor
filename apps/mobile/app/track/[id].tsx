import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { useLocalSearchParams } from 'expo-router'
import { io, type Socket } from 'socket.io-client'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { api, getApiBaseUrl, getErrorMessage } from '@/lib/api'
import { getToken } from '@/lib/auth'

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [storeName, setStoreName] = useState('')
  const [riderLocation, setRiderLocation] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!id) return
    let socket: Socket | null = null

    void (async () => {
      try {
        const { data } = await api.get<{
          success: boolean
          data: { status: string; storeName: string }
        }>(`/orders/${id}`)
        setStatus(data.data.status)
        setStoreName(data.data.storeName)

        const token = await getToken()
        socket = io(getApiBaseUrl(), { auth: { token } })
        socket.emit('join-order-room', { orderId: id })
        socket.on('location-updated', ({ lat, lng }: { lat: number; lng: number }) => {
          setRiderLocation({ lat, lng })
        })
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()

    return () => {
      if (socket) {
        socket.emit('leave-order-room', { orderId: id })
        socket.disconnect()
      }
    }
  }, [id])

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
      <Text style={styles.store}>{storeName}</Text>
      <OrderStatusBadge status={status} />
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: riderLocation?.lat ?? 19.076,
          longitude: riderLocation?.lng ?? 72.8777,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {riderLocation && (
          <Marker
            coordinate={{ latitude: riderLocation.lat, longitude: riderLocation.lng }}
            title="Rabbitor"
            pinColor="#16a34a"
          />
        )}
      </MapView>
      <Text style={styles.hint}>
        {riderLocation
          ? 'Live location updates while your order is on the way.'
          : 'Waiting for delivery partner location…'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#ef4444', marginBottom: 8 },
  store: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  map: { flex: 1, borderRadius: 16, marginTop: 12 },
  hint: { marginTop: 12, textAlign: 'center', color: '#6b7280', fontSize: 13 },
})
