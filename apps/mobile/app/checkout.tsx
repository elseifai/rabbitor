import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useCartStore } from '@/store/cart'

export default function CheckoutScreen() {
  const items = useCartStore((s) => s.items)
  const shopId = useCartStore((s) => s.shopId)
  const total = useCartStore((s) => s.total)
  const [loading, setLoading] = useState(false)

  const deliveryFee = 35
  const grandTotal = total() + deliveryFee
  const address = 'Royal Heights, Apartment 402, Sector 4, Mumbai, MH'

  const placeOrder = async () => {
    if (!shopId || items.length === 0) return
    setLoading(true)
    try {
      Alert.alert(
        'Prepaid checkout required',
        'Orders are placed only after successful online payment. Use the web checkout flow until mobile Razorpay is integrated.',
      )
    } catch {
      Alert.alert('Checkout failed', 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      <Text style={styles.subtitle}>Pay online to confirm your order</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Delivery address</Text>
        <Text style={styles.value}>{address}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Items ({items.length})</Text>
        {items.map((item) => (
          <Text key={item.productId} style={styles.line}>
            {item.name} x{item.quantity}
          </Text>
        ))}
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total payable</Text>
        <Text style={styles.totalValue}>₹{grandTotal}</Text>
      </View>

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void placeOrder()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pay & place order</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1C1C' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#878787' },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#878787', textTransform: 'uppercase' },
  value: { marginTop: 6, fontSize: 14, color: '#1C1C1C' },
  line: { marginTop: 4, fontSize: 14, color: '#1C1C1C' },
  totalRow: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1C1C1C' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#FF6B35' },
  button: {
    marginTop: 24,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
