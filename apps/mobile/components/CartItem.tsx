import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { CartItem } from '@/store/cart'

export function CartItemRow({
  item,
  onIncrease,
  onDecrease,
}: {
  item: CartItem
  onIncrease: () => void
  onDecrease: () => void
}) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>₹{item.price * item.quantity}</Text>
      </View>
      <View style={styles.qty}>
        <Pressable style={styles.qtyBtn} onPress={onDecrease}>
          <Text style={styles.qtyText}>−</Text>
        </Pressable>
        <Text style={styles.qtyValue}>{item.quantity}</Text>
        <Pressable style={styles.qtyBtn} onPress={onIncrease}>
          <Text style={styles.qtyText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#111827' },
  price: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  qty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  qtyValue: { minWidth: 20, textAlign: 'center', fontWeight: '700' },
})
