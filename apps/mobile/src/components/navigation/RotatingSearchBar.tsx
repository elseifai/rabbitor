import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { ROTATING_SEARCH_KEYWORDS } from '@/src/lib/sub-platforms'

const CYCLE_MS = 3000

export function RotatingSearchBar() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const opacity = useSharedValue(1)
  const translateY = useSharedValue(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      opacity.value = withTiming(0, { duration: 220 })
      translateY.value = withTiming(-6, { duration: 220 })

      setTimeout(() => {
        setIndex((i) => (i + 1) % ROTATING_SEARCH_KEYWORDS.length)
        translateY.value = 6
        opacity.value = 0
        translateY.value = withTiming(0, { duration: 280 })
        opacity.value = withTiming(1, { duration: 280 })
      }, 240)
    }, CYCLE_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [opacity, translateY])

  const keywordStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }))

  const keyword = ROTATING_SEARCH_KEYWORDS[index]

  return (
    <Pressable
      style={styles.bar}
      onPress={() => router.push('/search')}
      accessibilityRole="search"
      accessibilityLabel="Search products and stores"
    >
      <Text style={styles.icon}>🔍</Text>
      <View style={styles.placeholderRow}>
        <Text style={styles.prefix}>Search &quot;</Text>
        <Animated.Text style={[styles.keyword, keywordStyle]} numberOfLines={1}>
          {keyword}
        </Animated.Text>
        <Text style={styles.prefix}>&quot;</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  icon: { fontSize: 14, marginRight: 8 },
  placeholderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  prefix: { fontSize: 13, color: '#878787' },
  keyword: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#5C5C5C',
  },
})
