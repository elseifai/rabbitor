import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { io, type Socket } from 'socket.io-client'
import { api, getApiBaseUrl, getErrorMessage } from '@/lib/api'
import { getToken } from '@/lib/auth'
import { colors } from '@/lib/theme'

const STEPS = [
  { key: 'PENDING', label: 'Order placed', emoji: '📝' },
  { key: 'ACCEPTED_BY_SHOP', label: 'Accepted by shop', emoji: '✅' },
  { key: 'PREPARING', label: 'Packing your order', emoji: '📦' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', emoji: '🛵' },
  { key: 'DELIVERED', label: 'Delivered', emoji: '🎉' },
]

function stepIndex(status: string) {
  const i = STEPS.findIndex((s) => s.key === status)
  return i < 0 ? 0 : i
}

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('PENDING')
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
        socket.on('status-updated', ({ status: s }: { status: string }) => {
          if (s) setStatus(s)
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

  const current = stepIndex(status)
  const cancelled = status === 'CANCELLED'

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-subtle">
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface-subtle">
      {/* Map */}
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: riderLocation?.lat ?? 19.076,
          longitude: riderLocation?.lng ?? 72.8777,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        region={
          riderLocation
            ? {
                latitude: riderLocation.lat,
                longitude: riderLocation.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : undefined
        }
      >
        {riderLocation && (
          <Marker
            coordinate={{ latitude: riderLocation.lat, longitude: riderLocation.lng }}
            title="Rabbitor"
            description="Your delivery partner"
            pinColor={colors.brand}
          />
        )}
      </MapView>

      {/* Floating back button */}
      <Pressable
        onPress={() => router.replace('/(tabs)/orders')}
        style={{ top: insets.top + 8 }}
        className="absolute left-4 h-10 w-10 items-center justify-center rounded-full bg-white shadow"
      >
        <Text className="text-xl text-ink">‹</Text>
      </Pressable>

      {/* Status sheet */}
      <View
        style={{ paddingBottom: insets.bottom + 16 }}
        className="rounded-t-3xl bg-white px-5 pt-4"
      >
        <View className="mb-3 h-1 w-10 self-center rounded-full bg-surface-sunken" />

        {error ? (
          <Text className="py-4 text-center text-sm text-ink-muted">{error}</Text>
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-ink" numberOfLines={1}>
                  {cancelled ? 'Order cancelled' : STEPS[current].label}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-muted">{storeName}</Text>
              </View>
              {!cancelled && current < 4 && (
                <View className="rounded-xl bg-brand-50 px-3 py-2">
                  <Text className="text-2xs font-bold uppercase text-brand-700">ETA</Text>
                  <Text className="text-sm font-extrabold text-brand-700">
                    {Math.max(5, (4 - current) * 6)} min
                  </Text>
                </View>
              )}
            </View>

            {/* Timeline */}
            {!cancelled && (
              <View className="mt-4">
                {STEPS.map((step, i) => {
                  const done = i <= current
                  const active = i === current
                  return (
                    <View key={step.key} className="flex-row items-center py-1.5">
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-full ${
                          done ? 'bg-brand' : 'bg-surface-sunken'
                        }`}
                      >
                        <Text className="text-sm">{done ? step.emoji : '•'}</Text>
                      </View>
                      <Text
                        className={`ml-3 text-sm ${
                          active
                            ? 'font-extrabold text-ink'
                            : done
                              ? 'font-semibold text-ink-soft'
                              : 'text-ink-faint'
                        }`}
                      >
                        {step.label}
                      </Text>
                      {active && <View className="ml-2 h-2 w-2 rounded-full bg-brand" />}
                    </View>
                  )
                })}
              </View>
            )}

            <Text className="mt-3 text-center text-xs text-ink-faint">
              {riderLocation
                ? '📍 Live location updates while your order is on the way.'
                : 'Live tracking starts once a partner picks up your order.'}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}
