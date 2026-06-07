import { Pressable, StyleSheet, Text, View } from 'react-native'

type Shop = {
  id: string
  name: string
  storeType: string
  distanceKm?: number
  deliveryFee: number
  minOrderValue: number
  isOpen: boolean
}

export function ShopCard({ shop, onPress }: { shop: Shop; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{shop.name}</Text>
        <Text style={styles.badge}>{shop.storeType}</Text>
      </View>
      <Text style={styles.meta}>
        {shop.distanceKm != null ? `${shop.distanceKm} km · ` : ''}
        Min ₹{shop.minOrderValue} · Delivery ₹{shop.deliveryFee}
      </Text>
      <Text style={[styles.status, shop.isOpen ? styles.open : styles.closed]}>
        {shop.isOpen ? 'Open now' : 'Closed'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  meta: { marginTop: 6, fontSize: 13, color: '#6b7280' },
  status: { marginTop: 8, fontSize: 12, fontWeight: '600' },
  open: { color: '#16a34a' },
  closed: { color: '#ef4444' },
})
