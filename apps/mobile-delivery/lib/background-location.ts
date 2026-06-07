import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { broadcastLocation, getActiveOrderId } from './socket'

export const BACKGROUND_LOCATION_TASK = 'rabbit-background-location'

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return
  const locations = (data as { locations?: Location.LocationObject[] })?.locations
  const latest = locations?.[0]
  const orderId = getActiveOrderId()
  if (!latest || !orderId) return
  void broadcastLocation(orderId, latest.coords.latitude, latest.coords.longitude)
})

export async function startBackgroundLocationTracking(orderId: string): Promise<void> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync()
  if (fg !== 'granted') throw new Error('Foreground location permission required')

  const { status: bg } = await Location.requestBackgroundPermissionsAsync()
  if (bg !== 'granted') throw new Error('Background location permission required')

  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Rabbit Delivery',
      notificationBody: 'Broadcasting live location for active delivery',
    },
  })
}

export async function stopBackgroundLocationTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
  if (started) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
}
