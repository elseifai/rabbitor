import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
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
    <View className="flex-row items-center py-3">
      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken">
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <Text className="text-xl">🛍️</Text>
        )}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-faint">₹{item.price} each</Text>
      </View>

      <View className="flex-row items-center overflow-hidden rounded-lg border border-brand bg-brand">
        <Pressable onPress={onDecrease} className="h-8 w-8 items-center justify-center active:opacity-70">
          <Text className="text-base font-bold text-white">−</Text>
        </Pressable>
        <Text className="min-w-[20px] text-center text-sm font-extrabold text-white">
          {item.quantity}
        </Text>
        <Pressable onPress={onIncrease} className="h-8 w-8 items-center justify-center active:opacity-70">
          <Text className="text-base font-bold text-white">+</Text>
        </Pressable>
      </View>

      <Text className="ml-3 w-16 text-right text-sm font-extrabold text-ink">
        ₹{item.price * item.quantity}
      </Text>
    </View>
  )
}
