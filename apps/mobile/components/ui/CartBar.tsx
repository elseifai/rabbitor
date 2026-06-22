import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AnimatePresence, MotiView } from 'moti'
import { useRouter } from 'expo-router'
import { useCartStore } from '@/store/cart'

/** Sticky bottom cart bar that springs up when the cart has items. */
export function CartBar() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const count = useCartStore((s) => s.itemCount())
  const total = useCartStore((s) => s.total())

  return (
    <AnimatePresence>
      {count > 0 && (
        <MotiView
          from={{ translateY: 80, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 18, stiffness: 220 }}
          style={{ paddingBottom: insets.bottom + 10 }}
          className="absolute inset-x-0 bottom-0 px-4 pt-2"
        >
          <Pressable
            onPress={() => router.push('/cart')}
            className="flex-row items-center justify-between rounded-2xl bg-brand px-4 py-3.5 active:opacity-90"
            style={{
              shadowColor: '#FF6B35',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <View>
              <Text className="text-2xs font-bold uppercase tracking-wide text-white/80">
                {count} {count === 1 ? 'item' : 'items'}
              </Text>
              <Text className="text-base font-extrabold text-white">₹{total}</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-sm font-extrabold text-white">View cart</Text>
              <Text className="ml-1 text-base font-bold text-white">→</Text>
            </View>
          </Pressable>
        </MotiView>
      )}
    </AnimatePresence>
  )
}
