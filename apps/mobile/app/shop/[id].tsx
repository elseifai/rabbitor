import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ProductCard } from '@/components/ProductCard'
import { api, getErrorMessage } from '@/lib/api'
import { useCartStore } from '@/store/cart'

type Product = {
  id: string
  name: string
  price: number
  unit?: string | null
  isAvailable: boolean
}

export default function ShopScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const addItem = useCartStore((s) => s.addItem)
  const itemCount = useCartStore((s) => s.itemCount)
  const [storeName, setStoreName] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [storeRes, productsRes] = await Promise.all([
        api.get<{ success: boolean; data: { name: string } }>(`/stores/${id}`),
        api.get<{ success: boolean; data: Product[] }>(`/stores/${id}/products`),
      ])
      setStoreName(storeRes.data.data.name)
      setProducts(productsRes.data.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{storeName}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onAdd={() => {
              addItem({
                productId: item.id,
                shopId: id!,
                name: item.name,
                price: item.price,
              })
            }}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products listed.</Text>}
      />
      {itemCount() > 0 && (
        <Text style={styles.cartLink} onPress={() => router.push('/cart')}>
          View cart ({itemCount()})
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  error: { color: '#ef4444', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  cartLink: {
    textAlign: 'center',
    padding: 14,
    backgroundColor: '#16a34a',
    color: '#fff',
    fontWeight: '700',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
})
