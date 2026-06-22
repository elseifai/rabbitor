import { Tabs } from 'expo-router'
import { Text } from 'react-native'
import { colors } from '@/lib/theme'

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color, opacity: color === colors.brand ? 1 : 0.6 }}>{emoji}</Text>
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          borderTopColor: colors.line,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <TabIcon emoji="🧾" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  )
}
