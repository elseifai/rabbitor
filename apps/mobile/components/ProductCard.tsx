import { Pressable, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { AnimatePresence, MotiView } from 'moti'
import { useCartStore } from '@/store/cart'
import { colors } from '@/lib/theme'

export type Product = {
  id: string
  name: string
  price: number
  mrp?: number | null
  unit?: string | null
  image?: string | null
  isAvailable: boolean
}

export function ProductCard({
  product,
  shopId,
  emoji = '📦',
  tint = '#F1F5F9',
}: {
  product: Product
  shopId: string
  emoji?: string
  tint?: string
}) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const item = useCartStore((s) => s.items.find((i) => i.productId === product.id))
  const qty = item?.quantity ?? 0

  const mrp = product.mrp && product.mrp > product.price ? product.mrp : null
  const discount = mrp ? Math.round(((mrp - product.price) / mrp) * 100) : 0
  const off = !product.isAvailable

  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-line bg-white p-3">
      <View
        className="h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-xl"
        style={{ backgroundColor: tint }}
      >
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Text className="text-3xl">{emoji}</Text>
        )}
        {discount > 0 && !off && (
          <View className="absolute left-0 top-0 rounded-br-lg bg-success px-1 py-0.5">
            <Text className="text-2xs font-bold text-white">{discount}%</Text>
          </View>
        )}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-ink" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-faint">{product.unit ?? '1 pc'}</Text>
        <View className="mt-1 flex-row items-center">
          <Text className="text-sm font-extrabold text-ink">₹{product.price}</Text>
          {mrp && (
            <Text className="ml-1.5 text-xs text-ink-faint line-through">₹{mrp}</Text>
          )}
        </View>
      </View>

      {/* ADD / stepper */}
      <View className="ml-2 w-[92px] items-end">
        {off ? (
          <View className="rounded-xl border border-line px-3 py-2">
            <Text className="text-xs font-bold text-ink-faint">Sold out</Text>
          </View>
        ) : (
          <AnimatePresence exitBeforeEnter>
            {qty > 0 ? (
              <MotiView
                key="stepper"
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'timing', duration: 140 }}
                className="flex-row items-center overflow-hidden rounded-xl border border-brand bg-brand"
              >
                <Pressable
                  onPress={() => updateQuantity(product.id, qty - 1)}
                  className="h-9 w-9 items-center justify-center active:opacity-70"
                >
                  <Text className="text-lg font-bold text-white">−</Text>
                </Pressable>
                <Text className="min-w-[22px] text-center text-sm font-extrabold text-white">
                  {qty}
                </Text>
                <Pressable
                  onPress={() => updateQuantity(product.id, qty + 1)}
                  className="h-9 w-9 items-center justify-center active:opacity-70"
                >
                  <Text className="text-lg font-bold text-white">+</Text>
                </Pressable>
              </MotiView>
            ) : (
              <MotiView
                key="add"
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'timing', duration: 140 }}
              >
                <Pressable
                  onPress={() =>
                    addItem({
                      productId: product.id,
                      shopId,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                    })
                  }
                  className="rounded-xl border border-brand bg-brand-50 px-5 py-2 active:opacity-80"
                >
                  <Text className="text-sm font-extrabold" style={{ color: colors.brand }}>
                    ADD
                  </Text>
                </Pressable>
              </MotiView>
            )}
          </AnimatePresence>
        )}
      </View>
    </View>
  )
}
