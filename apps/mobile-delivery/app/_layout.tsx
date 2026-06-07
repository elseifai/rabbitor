import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { setUnauthorizedHandler } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'

export default function RootLayout() {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    setUnauthorizedHandler(() => router.replace('/auth'))
  }, [router])

  useEffect(() => {
    void (async () => {
      const authed = await isAuthenticated()
      const inAuth = segments[0] === 'auth'
      if (!authed && !inAuth) router.replace('/auth')
      if (authed && inAuth) router.replace('/')
    })()
  }, [segments, router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: true }}>
        <Stack.Screen name="index" options={{ title: 'Jobs' }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="job/[id]" options={{ title: 'Job Detail' }} />
        <Stack.Screen name="navigate" options={{ title: 'Active Delivery' }} />
        <Stack.Screen name="earnings" options={{ title: 'Earnings' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
