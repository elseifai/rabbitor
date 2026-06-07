import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'
import { useCartStore } from '@/store/cart'

export default function CheckoutScreen() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const shopId = useCartStore((s) => s.shopId)
  const total = useCartStore((s) => s.total)
  const clearCart = useCartStore((s) => s.clearCart)
  const [loading, setLoading] = useState(false)

  const deliveryFee = 35
  const grandTotal = total() + deliveryFee
  const address = 'Royal Heights, Apartment 402, Sector 4, Mumbai, MH'

  const placeOrder = async () => {
    if (!shopId || items.length === 0) return
    setLoading(true)
    try {
      const { data: orderRes } = await api.post<{
        success: boolean
        data: { id: string }
      }>('/orders', {
        storeId: shopId,
        deliveryMethod: 'RABBITOR',
        deliveryAddress: address,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      })

      const orderId = orderRes.data.id

      const { data: paymentRes } = await api.post<{
        success: boolean
        data: { razorpayOrderId: string; amount: number; key: string }
      }>('/payments/create', { orderId })

      Alert.alert(
        'Payment',
        `Razorpay order ${paymentRes.data.razorpayOrderId} created for ₹${paymentRes.data.amount / 100}. Complete payment in production with react-native-razorpay.`,
        [
          {
            text: 'Continue (dev)',
            onPress: () => {
              clearCart()
              router.replace(`/track/${orderId}`)
            },
          },
        ],
      )
    } catch (err) {
      Alert.alert('Checkout failed', getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.section}>Deliver to</Text>
      <Text style={styles.address}>{address}</Text>

      <View style={styles.summary}>
        <View style={styles.row}>
          <Text>Items</Text>
          <Text>₹{total()}</Text>
        </View>
        <View style={styles.row}>
          <Text>Delivery</Text>
          <Text>₹{deliveryFee}</Text>
        </View>
        <View style={[styles.row, styles.grand]}>
          <Text style={styles.grandLabel}>To pay</Text>
          <Text style={styles.grandValue}>₹{grandTotal}</Text>
        </View>
      </View>

      <Pressable style={styles.button} disabled={loading} onPress={() => void placeOrder()}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pay ₹{grandTotal}</Text>
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  section: { fontSize: 12, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase' },
  address: { marginTop: 4, fontSize: 15, color: '#111827', marginBottom: 20 },
  summary: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  grand: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12, marginTop: 4 },
  grandLabel: { fontWeight: '800', fontSize: 16 },
  grandValue: { fontWeight: '800', fontSize: 16, color: '#16a34a' },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
