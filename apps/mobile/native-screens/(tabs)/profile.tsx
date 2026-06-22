import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'
import { clearToken } from '@/lib/auth'

type Me = { name?: string | null; phone?: string | null }

const MENU = [
  { label: 'My Orders', emoji: '🧾', route: '/(tabs)/orders' as const },
  { label: 'Saved Addresses', emoji: '📍', route: null },
  { label: 'Payments', emoji: '💳', route: null },
  { label: 'Help & Support', emoji: '🛟', route: null },
  { label: 'About Rabbitor', emoji: 'ℹ️', route: null },
]

export default function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [me, setMe] = useState<Me | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{ success: boolean; data: Me }>('/auth/me')
        setMe(data.data)
      } catch {
        setMe(null)
      }
    })()
  }, [])

  const logout = async () => {
    await clearToken()
    router.replace('/auth')
  }

  const name = me?.name || 'Rabbit Customer'
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <View className="flex-1 bg-surface-subtle">
      <View style={{ paddingTop: insets.top + 8 }} className="bg-white px-4 pb-3">
        <Text className="text-xl font-extrabold text-ink">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {/* Identity card */}
        <View className="flex-row items-center rounded-2xl border border-line bg-white p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <Text className="text-lg font-black text-brand">{initials}</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-extrabold text-ink">{name}</Text>
            <Text className="text-sm text-ink-muted">
              {me?.phone ? `+91 ${me.phone}` : 'Tap to complete your profile'}
            </Text>
          </View>
        </View>

        {/* Menu */}
        <View className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
          {MENU.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() =>
                item.route ? router.push(item.route) : Alert.alert(item.label, 'Coming soon.')
              }
              className={`flex-row items-center px-4 py-4 active:bg-surface-subtle ${
                i > 0 ? 'border-t border-line' : ''
              }`}
            >
              <Text className="text-lg">{item.emoji}</Text>
              <Text className="ml-3 flex-1 text-sm font-semibold text-ink">{item.label}</Text>
              <Text className="text-ink-faint">›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => void logout()}
          className="mt-6 items-center rounded-2xl border border-line bg-white py-4 active:opacity-80"
        >
          <Text className="text-sm font-bold text-red-500">Log out</Text>
        </Pressable>

        <Text className="mt-6 text-center text-2xs text-ink-faint">Rabbitor · v1.0.0</Text>
      </ScrollView>
    </View>
  )
}
