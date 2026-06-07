import { Pressable, StyleSheet, Text, View } from 'react-native'

type Product = {
  id: string
  name: string
  price: number
  unit?: string | null
  isAvailable: boolean
}

export function ProductCard({
  product,
  onAdd,
}: {
  product: Product
  onAdd: () => void
}) {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit ?? 'piece'}</Text>
        <Text style={styles.price}>₹{product.price}</Text>
      </View>
      <Pressable
        style={[styles.button, !product.isAvailable && styles.buttonDisabled]}
        disabled={!product.isAvailable}
        onPress={onAdd}
      >
        <Text style={styles.buttonText}>{product.isAvailable ? 'Add' : 'Off'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  unit: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: '#16a34a', marginTop: 4 },
  button: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonDisabled: { backgroundColor: '#d1d5db' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
