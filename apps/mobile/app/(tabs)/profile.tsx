import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { clearToken } from '@/lib/auth'

export default function ProfileScreen() {
  const router = useRouter()

  const logout = async () => {
    await clearToken()
    router.replace('/auth')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your account</Text>
      <Text style={styles.subtitle}>Manage orders, addresses, and notifications.</Text>

      <Pressable style={styles.button} onPress={() => router.push('/(tabs)/orders')}>
        <Text style={styles.buttonText}>My Orders</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.outline]}
        onPress={() => Alert.alert('Support', 'Email support@rabbit.app for help.')}
      >
        <Text style={[styles.buttonText, styles.outlineText]}>Help & Support</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.danger]} onPress={() => void logout()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { marginTop: 8, color: '#6b7280', marginBottom: 24 },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  outlineText: { color: '#111827' },
  danger: { backgroundColor: '#ef4444', marginTop: 24 },
  buttonText: { color: '#fff', fontWeight: '700' },
})
