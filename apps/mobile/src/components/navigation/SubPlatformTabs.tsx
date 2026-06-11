import { useCallback, useEffect, useState } from 'react'
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SUB_PLATFORM_TABS, type SubPlatformId } from '@/src/lib/sub-platforms'

type TabLayout = { x: number; width: number }

type Props = {
  activeTab: SubPlatformId
  onChange: (tab: SubPlatformId) => void
}

export function SubPlatformTabs({ activeTab, onChange }: Props) {
  const [layouts, setLayouts] = useState<Partial<Record<SubPlatformId, TabLayout>>>({})
  const indicatorX = useSharedValue(0)
  const indicatorWidth = useSharedValue(0)
  const activeTheme = SUB_PLATFORM_TABS.find((t) => t.id === activeTab) ?? SUB_PLATFORM_TABS[0]

  const updateIndicator = useCallback(
    (tab: SubPlatformId) => {
      const layout = layouts[tab]
      if (!layout) return
      indicatorX.value = withTiming(layout.x, { duration: 300 })
      indicatorWidth.value = withTiming(layout.width, { duration: 300 })
    },
    [layouts, indicatorX, indicatorWidth],
  )

  useEffect(() => {
    updateIndicator(activeTab)
  }, [activeTab, updateIndicator])

  const animatedPill = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }))

  const onTabLayout = (tab: SubPlatformId) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    setLayouts((prev) => ({ ...prev, [tab]: { x, width } }))
  }

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.track}
      >
        <View style={styles.inner}>
          <Animated.View
            style={[styles.pill, animatedPill, { backgroundColor: activeTheme.pillColor }]}
          />
          {SUB_PLATFORM_TABS.map((tab) => {
            const selected = tab.id === activeTab
            return (
              <Pressable
                key={tab.id}
                onLayout={onTabLayout(tab.id)}
                onPress={() => onChange(tab.id)}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: selected ? tab.activeText : tab.idleText },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 8 },
  track: { paddingVertical: 4 },
  inner: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    zIndex: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
})
