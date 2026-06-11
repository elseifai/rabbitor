import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
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
      if (authed && inAuth) router.replace('/(tabs)')
    })()
  }, [segments, router])

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="search" options={{ headerShown: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="shop/[id]" options={{ headerShown: true, title: 'Shop' }} />
          <Stack.Screen name="cart" options={{ headerShown: true, title: 'Cart' }} />
          <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Checkout' }} />
          <Stack.Screen name="track/[id]" options={{ headerShown: true, title: 'Track Order' }} />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}
