import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { CartItemRow } from '@/components/CartItem'
import { useCartStore } from '@/store/cart'

const FREE_DELIVERY_OVER = 199

export default function CartScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const total = useCartStore((s) => s.total())

  const remaining = Math.max(0, FREE_DELIVERY_OVER - total)

  return (
    <View className="flex-1 bg-surface-subtle">
      <View style={{ paddingTop: insets.top + 6 }} className="flex-row items-center bg-white px-4 pb-3">
        <Pressable onPress={() => router.back()} className="pr-3 py-1">
          <Text className="text-2xl text-ink">‹</Text>
        </Pressable>
        <Text className="text-[17px] font-extrabold text-ink">Your cart</Text>
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-5xl">🛒</Text>
          <Text className="mt-4 text-base font-bold text-ink">Your cart is empty</Text>
          <Text className="mt-1 text-center text-sm text-ink-muted">
            Add items from a nearby shop to get started.
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="mt-6 rounded-xl bg-brand px-6 py-3"
          >
            <Text className="font-bold text-white">Browse shops</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
            {/* Free-delivery progress */}
            {remaining > 0 ? (
              <View className="mb-4 rounded-xl bg-brand-50 px-4 py-3">
                <Text className="text-xs font-semibold text-brand-700">
                  Add ₹{remaining} more for FREE delivery 🚚
                </Text>
                <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
                  <View
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.min(100, (total / FREE_DELIVERY_OVER) * 100)}%` }}
                  />
                </View>
              </View>
            ) : (
              <View className="mb-4 rounded-xl bg-green-50 px-4 py-3">
                <Text className="text-xs font-semibold text-success">
                  🎉 You&apos;ve unlocked FREE delivery!
                </Text>
              </View>
            )}

            <View className="rounded-2xl border border-line bg-white px-4">
              {items.map((item, i) => (
                <View
                  key={item.productId}
                  className={i > 0 ? 'border-t border-line' : ''}
                >
                  <CartItemRow
                    item={item}
                    onIncrease={() => updateQuantity(item.productId, item.quantity + 1)}
                    onDecrease={() => updateQuantity(item.productId, item.quantity - 1)}
                  />
                </View>
              ))}
            </View>

            {/* Bill summary */}
            <View className="mt-4 rounded-2xl border border-line bg-white p-4">
              <Text className="mb-3 text-sm font-extrabold text-ink">Bill details</Text>
              <Row label="Item total" value={`₹${total}`} />
              <Row
                label="Delivery fee"
                value={remaining > 0 ? 'At checkout' : 'FREE'}
                valueClass={remaining > 0 ? 'text-ink-muted' : 'text-success'}
              />
              <View className="my-2 h-px bg-line" />
              <Row label="To pay" value={`₹${total}`} bold />
              <Text className="mt-1 text-2xs text-ink-faint">
                Delivery & taxes are confirmed at checkout.
              </Text>
            </View>
          </ScrollView>

          {/* Sticky checkout */}
          <View
            style={{ paddingBottom: insets.bottom + 10 }}
            className="absolute inset-x-0 bottom-0 border-t border-line bg-white px-4 pt-3"
          >
            <Pressable
              onPress={() => router.push('/checkout')}
              className="flex-row items-center justify-between rounded-2xl bg-brand px-5 py-4 active:opacity-90"
            >
              <Text className="text-base font-extrabold text-white">₹{total}</Text>
              <Text className="text-base font-extrabold text-white">Proceed to checkout →</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  )
}

function Row({
  label,
  value,
  bold,
  valueClass,
}: {
  label: string
  value: string
  bold?: boolean
  valueClass?: string
}) {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className={`text-sm ${bold ? 'font-extrabold text-ink' : 'text-ink-muted'}`}>
        {label}
      </Text>
      <Text className={`text-sm ${bold ? 'font-extrabold text-ink' : valueClass ?? 'text-ink'}`}>
        {value}
      </Text>
    </View>
  )
}
