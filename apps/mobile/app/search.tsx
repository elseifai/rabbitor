import { useCallback, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

const TRENDING_SEARCHES = [
  'Amul Taaza Milk',
  'Britannia Bread',
  'Maggi Noodles',
  'Alphonso Mangoes',
  "Lay's Chips",
  'Type-C Cable',
  'Fresh Paneer',
  'Running Shoes',
] as const

export default function SearchScreen() {
  const router = useRouter()
  const inputRef = useRef<TextInput>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(timer)
  }, [])

  const filtered = TRENDING_SEARCHES.filter((term) =>
    term.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const onSelect = useCallback(
    (term: string) => {
      setQuery(term)
    },
    [],
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.inputWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder='Search "atta", "fish", "shoes"...'
            placeholderTextColor="#878787"
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text style={styles.trendingTitle}>Trending Searches</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.trendingRow} onPress={() => onSelect(item)}>
            <Text style={styles.flame}>🔥</Text>
            <Text style={styles.trendingLabel}>{item}</Text>
          </Pressable>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No trending matches for this query.</Text>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, color: '#1C1C1C' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#1C1C1C' },
  list: { padding: 16, paddingBottom: 32 },
  trendingTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#878787',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  flame: { fontSize: 14 },
  trendingLabel: { fontSize: 15, fontWeight: '600', color: '#1C1C1C' },
  empty: { color: '#9ca3af', marginTop: 24, textAlign: 'center' },
})
