import { StyleSheet, Text, View } from 'react-native'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  ACCEPTED_BY_SHOP: { bg: '#dbeafe', text: '#1e40af' },
  PREPARING: { bg: '#e0e7ff', text: '#3730a3' },
  OUT_FOR_DELIVERY: { bg: '#ffedd5', text: '#c2410c' },
  DELIVERED: { bg: '#dcfce7', text: '#166534' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
}

export function OrderStatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151' }
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{status.replace(/_/g, ' ')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
})
