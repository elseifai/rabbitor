import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { CartItemRow } from '@/components/CartItem'
import { useCartStore } from '@/store/cart'

export default function CartScreen() {
  const router = useRouter()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const total = useCartStore((s) => s.total)

  return (
    <View style={styles.container}>
      {items.length === 0 ? (
        <Text style={styles.empty}>Your cart is empty.</Text>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.productId}
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onIncrease={() => updateQuantity(item.productId, item.quantity + 1)}
                onDecrease={() => updateQuantity(item.productId, item.quantity - 1)}
              />
            )}
          />
          <View style={styles.footer}>
            <Text style={styles.total}>Total: ₹{total()}</Text>
            <Pressable style={styles.button} onPress={() => router.push('/checkout')}>
              <Text style={styles.buttonText}>Proceed to checkout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  footer: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 },
  total: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
})
