import { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'

/** A shimmering placeholder block. Pass tailwind classes for size/shape via `className`. */
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(0.5)

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    )
  }, [opacity])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View style={style} className={`bg-surface-sunken ${className ?? ''}`} />
  )
}

/** Skeleton matching the ShopCard layout. */
export function ShopCardSkeleton() {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-line bg-white p-3">
      <Skeleton className="h-16 w-16 rounded-2xl" />
      <View className="ml-3 flex-1">
        <Skeleton className="h-4 w-2/3 rounded-md" />
        <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
        <Skeleton className="mt-2 h-3 w-1/3 rounded-md" />
      </View>
    </View>
  )
}
