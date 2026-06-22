import { Text, View } from 'react-native'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#92400E' },
  ACCEPTED_BY_SHOP: { bg: '#DBEAFE', text: '#1E40AF' },
  PREPARING: { bg: '#E0E7FF', text: '#3730A3' },
  OUT_FOR_DELIVERY: { bg: '#FFEDD5', text: '#C2410C' },
  DELIVERED: { bg: '#DCFCE7', text: '#166534' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
}

export function OrderStatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#F1F5F9', text: '#374151' }
  return (
    <View style={{ backgroundColor: c.bg }} className="self-start rounded-full px-2.5 py-1">
      <Text style={{ color: c.text }} className="text-2xs font-bold uppercase tracking-wide">
        {status.replace(/_/g, ' ')}
      </Text>
    </View>
  )
}
