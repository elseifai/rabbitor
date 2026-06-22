import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { api, getErrorMessage } from '@/lib/api'
import { useCartStore } from '@/store/cart'
import { colors } from '@/lib/theme'

type PayMethod = 'ONLINE' | 'COD'

export default function CheckoutScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const items = useCartStore((s) => s.items)
  const shopId = useCartStore((s) => s.shopId)
  const total = useCartStore((s) => s.total())
  const clearCart = useCartStore((s) => s.clearCart)
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<PayMethod>('ONLINE')
  const [address, setAddress] = useState('Royal Heights, Apartment 402, Sector 4, Mumbai, MH')
  const [instructions, setInstructions] = useState('')

  const deliveryFee = total >= 199 ? 0 : 35
  const grandTotal = total + deliveryFee

  const placeOrder = async () => {
    if (!shopId || items.length === 0) {
      Alert.alert('Cart empty', 'Add items before checking out.')
      return
    }
    if (address.trim().length < 8) {
      Alert.alert('Address needed', 'Please enter a valid delivery address.')
      return
    }
    setLoading(true)
    try {
      const { data: orderRes } = await api.post<{ success: boolean; data: { id: string } }>(
        '/orders',
        {
          storeId: shopId,
          deliveryMethod: 'RABBITOR',
          deliveryAddress: address.trim(),
          deliveryInstruction: instructions.trim() || undefined,
          paymentMethod: method,
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      )
      const orderId = orderRes.data.id

      if (method === 'COD') {
        clearCart()
        router.replace(`/track/${orderId}`)
        return
      }

      const { data: paymentRes } = await api.post<{
        success: boolean
        data: { razorpayOrderId: string; amount: number; key: string }
      }>('/payments/create', { orderId })

      Alert.alert(
        'Payment',
        `Razorpay order ${paymentRes.data.razorpayOrderId} for ₹${paymentRes.data.amount / 100}. Complete in production with react-native-razorpay.`,
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
    <View className="flex-1 bg-surface-subtle">
      <View style={{ paddingTop: insets.top + 6 }} className="flex-row items-center bg-white px-4 pb-3">
        <Pressable onPress={() => router.back()} className="pr-3 py-1">
          <Text className="text-2xl text-ink">‹</Text>
        </Pressable>
        <Text className="text-[17px] font-extrabold text-ink">Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 160 }}>
        {/* Address */}
        <View className="rounded-2xl border border-line bg-white p-4">
          <Text className="text-2xs font-bold uppercase tracking-wide text-ink-faint">
            📍 Deliver to
          </Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            multiline
            placeholder="Enter your full delivery address"
            placeholderTextColor={colors.inkFaint}
            className="mt-2 text-[15px] leading-5 text-ink"
          />
        </View>

        {/* Instructions */}
        <View className="mt-4 rounded-2xl border border-line bg-white p-4">
          <Text className="text-2xs font-bold uppercase tracking-wide text-ink-faint">
            📝 Delivery instructions
          </Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder="e.g. Ring the bell, leave at door"
            placeholderTextColor={colors.inkFaint}
            className="mt-2 text-[15px] text-ink"
          />
        </View>

        {/* Payment method */}
        <Text className="mb-2 mt-5 text-sm font-extrabold text-ink">Payment method</Text>
        <View className="flex-row gap-3">
          <PayOption
            label="Pay online"
            sub="UPI / Card"
            active={method === 'ONLINE'}
            onPress={() => setMethod('ONLINE')}
          />
          <PayOption
            label="Cash on delivery"
            sub="Pay at door"
            active={method === 'COD'}
            onPress={() => setMethod('COD')}
          />
        </View>

        {/* Bill */}
        <View className="mt-5 rounded-2xl border border-line bg-white p-4">
          <Text className="mb-3 text-sm font-extrabold text-ink">Bill details</Text>
          <Row label={`Item total (${items.length})`} value={`₹${total}`} />
          <Row
            label="Delivery fee"
            value={deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            valueClass={deliveryFee === 0 ? 'text-success' : 'text-ink'}
          />
          <View className="my-2 h-px bg-line" />
          <Row label="To pay" value={`₹${grandTotal}`} bold />
        </View>
      </ScrollView>

      {/* Sticky pay */}
      <View
        style={{ paddingBottom: insets.bottom + 10 }}
        className="absolute inset-x-0 bottom-0 border-t border-line bg-white px-4 pt-3"
      >
        <Pressable
          disabled={loading}
          onPress={() => void placeOrder()}
          className="flex-row items-center justify-center rounded-2xl bg-brand px-5 py-4 active:opacity-90"
          style={loading ? { opacity: 0.7 } : undefined}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-extrabold text-white">
              {method === 'COD' ? `Place order · ₹${grandTotal}` : `Pay ₹${grandTotal}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

function PayOption({
  label,
  sub,
  active,
  onPress,
}: {
  label: string
  sub: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-2xl border-2 p-3.5 ${
        active ? 'border-brand bg-brand-50' : 'border-line bg-white'
      }`}
    >
      <Text className={`text-sm font-extrabold ${active ? 'text-brand-700' : 'text-ink'}`}>
        {label}
      </Text>
      <Text className="mt-0.5 text-xs text-ink-muted">{sub}</Text>
    </Pressable>
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
