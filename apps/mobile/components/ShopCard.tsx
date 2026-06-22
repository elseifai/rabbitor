import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { MotiView } from 'moti'
import { storeMeta, etaMinutes } from '@/lib/theme'

export type Shop = {
  id: string
  name: string
  storeType: string
  image?: string | null
  rating?: number
  distanceKm?: number
  deliveryFee: number
  minOrderValue: number
  isOpen: boolean
}

export function ShopCard({
  shop,
  onPress,
  index = 0,
}: {
  shop: Shop
  onPress: () => void
  index?: number
}) {
  const meta = storeMeta(shop.storeType)
  const eta = etaMinutes(shop.distanceKm)
  const rating = shop.rating ?? 4.3

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 280, delay: Math.min(index, 8) * 45 }}
    >
      <Pressable
        onPress={onPress}
        className="mb-3 flex-row items-center rounded-2xl border border-line bg-white p-3 active:opacity-80"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        }}
      >
        <View
          className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl"
          style={{ backgroundColor: meta.tint }}
        >
          {shop.image ? (
            <Image
              source={{ uri: shop.image }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <Text className="text-3xl">{meta.emoji}</Text>
          )}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-[15px] font-bold text-ink" numberOfLines={1}>
              {shop.name}
            </Text>
            <View className="ml-2 flex-row items-center rounded-md bg-success px-1.5 py-0.5">
              <Text className="text-2xs font-bold text-white">★ {rating.toFixed(1)}</Text>
            </View>
          </View>

          <Text className="mt-0.5 text-xs font-medium text-ink-faint" numberOfLines={1}>
            {meta.label}
            {shop.distanceKm != null ? ` · ${shop.distanceKm.toFixed(1)} km` : ''}
          </Text>

          <View className="mt-1.5 flex-row items-center">
            {shop.isOpen ? (
              <Text className="text-xs font-bold text-ink">⚡ {eta} mins</Text>
            ) : (
              <Text className="text-xs font-bold text-brand-700">Closed now</Text>
            )}
            <Text className="mx-1.5 text-ink-faint">·</Text>
            <Text className="text-xs text-ink-muted">
              {shop.deliveryFee === 0 ? 'Free delivery' : `₹${shop.deliveryFee} delivery`}
            </Text>
          </View>
        </View>
      </Pressable>
    </MotiView>
  )
}
