import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'
import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from '@/lib/background-location'
import { broadcastLocation, joinOrderRoom, leaveOrderRoom, setActiveOrderForBackground } from '@/lib/socket'

export default function NavigateScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState('')
  const [current, setCurrent] = useState<{ lat: number; lng: number } | null>(null)
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null)
  const [delivering, setDelivering] = useState(false)
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const lastBroadcast = useRef(0)

  useEffect(() => {
    if (!orderId) return

    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') throw new Error('Location permission required')

        const { data } = await api.get<{
          success: boolean
          data: {
            deliveryAddress: string
            destLatitude: number | null
            destLongitude: number | null
          }
        }>(`/rabbitor/orders/${orderId}`)
        setAddress(data.data.deliveryAddress)
        if (data.data.destLatitude != null && data.data.destLongitude != null) {
          setDestination({ lat: data.data.destLatitude, lng: data.data.destLongitude })
        }

        await joinOrderRoom(orderId)
        await setActiveOrderForBackground(orderId)
        try {
          await startBackgroundLocationTracking(orderId)
        } catch {
          // Background tracking optional if permissions denied
        }

        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
          (loc) => {
            const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude }
            setCurrent(coords)
            const now = Date.now()
            if (now - lastBroadcast.current >= 5000) {
              lastBroadcast.current = now
              void broadcastLocation(orderId, coords.lat, coords.lng)
            }
          },
        )
      } catch (err) {
        Alert.alert('Error', getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()

    return () => {
      watchRef.current?.remove()
      void leaveOrderRoom(orderId!)
      void stopBackgroundLocationTracking()
      void setActiveOrderForBackground(null)
    }
  }, [orderId])

  const markDelivered = async () => {
    if (!orderId) return
    setDelivering(true)
    try {
      await api.patch(`/orders/${orderId}/status`, { status: 'DELIVERED' })
      Alert.alert('Delivered', 'Order marked as delivered.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ])
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err))
    } finally {
      setDelivering(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.addressLabel}>Deliver to</Text>
      <Text style={styles.address}>{address}</Text>
      <MapView
        style={styles.map}
        showsUserLocation
        initialRegion={{
          latitude: current?.lat ?? destination?.lat ?? 19.076,
          longitude: current?.lng ?? destination?.lng ?? 72.8777,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
      >
        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title="Customer"
            pinColor="#FF6B35"
          />
        )}
      </MapView>
      <Pressable style={styles.button} disabled={delivering} onPress={() => void markDelivered()}>
        {delivering ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Mark as Delivered</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addressLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  address: { marginBottom: 12, fontSize: 15, color: '#111827' },
  map: { flex: 1, borderRadius: 16 },
  button: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800' },
})
