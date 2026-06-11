import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/src/lib/format'

export type ProductCardVariant = 'GROCERY' | 'RETAIL'

export type UnifiedProduct = {
  id: string
  name: string
  price: number
  mrp?: number | null
  unit?: string
  variantName?: string
  image?: string | null
  shopId: string
  shopName: string
  storeType?: string
  stock?: number
  optionCount?: number
  sizes?: string[]
  colors?: string[]
}

const ZEPTO_PINK = '#E42575'
const IMAGE_BACKDROP = '#F7F9FA'

function placeholderEmoji(storeType?: string) {
  switch (storeType) {
    case 'FISH':
      return '🐟'
    case 'VEGETABLE':
      return '🥦'
    case 'DAIRY':
      return '🥛'
    case 'GENERAL':
      return '👗'
    default:
      return '📦'
  }
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: {},
})

const floatingShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  android: { elevation: 4 },
  default: {},
})

export function UnifiedProductCard({
  product,
  variant = 'GROCERY',
  style,
}: {
  product: UnifiedProduct
  variant?: ProductCardVariant
  style?: object
}) {
  const addItem = useCartStore((s) => s.addItem)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const shopId = useCartStore((s) => s.shopId)
  const items = useCartStore((s) => s.items)
  const inCart = items.find((i) => i.productId === product.id)

  const originalPrice =
    product.mrp && product.mrp > product.price ? product.mrp : null
  const discount = originalPrice
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0
  const outOfStock = product.stock === 0
  const optionCount = product.optionCount ?? 4
  const sizeLabel = product.variantName || product.unit || '1 pc'

  const payload = {
    productId: product.id,
    shopId: product.shopId,
    name: product.name,
    price: product.price,
    image: product.image,
  }

  const handleAdd = () => {
    if (shopId && shopId !== product.shopId && items.length > 0) {
      Alert.alert(
        'Replace cart items?',
        `Your cart has items from another store. Clear and add from ${product.shopName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace cart', onPress: () => addItem(payload) },
        ],
      )
      return
    }
    addItem(payload)
  }

  if (variant === 'RETAIL') {
    return (
      <View style={[styles.retailCard, style]}>
        <View style={styles.retailImageWrap}>
          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.retailImage} />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackEmoji}>{placeholderEmoji(product.storeType)}</Text>
            </View>
          )}
        </View>

        <View style={styles.retailBody}>
          <Text style={styles.retailName} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.tagRow}>
            {(product.sizes ?? ['S', 'M', 'L']).slice(0, 3).map((size) => (
              <Text key={size} style={styles.sizeTag}>
                {size}
              </Text>
            ))}
            {(product.colors ?? ['Black']).map((color) => (
              <Text key={color} style={styles.colorTag}>
                {color}
              </Text>
            ))}
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.retailPrice}>{formatCurrency(product.price)}</Text>
            {originalPrice ? (
              <Text style={styles.strike}>{formatCurrency(originalPrice)}</Text>
            ) : null}
          </View>

          {!outOfStock &&
            (inCart ? (
              <View style={styles.retailStepper}>
                <Pressable
                  onPress={() => updateQuantity(product.id, inCart.quantity - 1)}
                  style={styles.stepperBtn}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperQty}>{inCart.quantity}</Text>
                <Pressable
                  onPress={() => updateQuantity(product.id, inCart.quantity + 1)}
                  style={[styles.stepperBtn, styles.stepperBtnPlus]}
                >
                  <Text style={[styles.stepperBtnText, styles.stepperBtnTextDark]}>+</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.retailAddBtn} onPress={handleAdd}>
                <Text style={styles.retailAddText}>
                  ADD / {optionCount} options available
                </Text>
              </Pressable>
            ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.groceryCard, cardShadow, style]}>
      {/* Image backdrop — Zepto light grey with contain */}
      <View style={styles.groceryImageWrap}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.groceryImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.fallbackEmoji}>{placeholderEmoji(product.storeType)}</Text>
          </View>
        )}

        {originalPrice && discount > 0 && !outOfStock && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{discount}% OFF</Text>
          </View>
        )}

        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}

        {/* Floating overlap — ADD or − Qty + */}
        {!outOfStock &&
          (inCart ? (
            <View style={[styles.groceryStepper, floatingShadow]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => updateQuantity(product.id, inCart.quantity - 1)}
                style={styles.groceryStepperBtn}
                accessibilityLabel="Decrease quantity"
              >
                <Text style={styles.groceryStepperSymbol}>−</Text>
              </TouchableOpacity>
              <Text style={styles.groceryStepperQty}>{inCart.quantity}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => updateQuantity(product.id, inCart.quantity + 1)}
                style={[styles.groceryStepperBtn, styles.groceryStepperBtnPlus]}
                accessibilityLabel="Increase quantity"
              >
                <Text style={[styles.groceryStepperSymbol, styles.groceryStepperSymbolOnPink]}>
                  +
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.groceryAddBtn, floatingShadow]}
              onPress={handleAdd}
              accessibilityLabel={`Add ${product.name} to cart`}
            >
              <Text style={styles.groceryAddLabel}>ADD</Text>
              <Text style={styles.groceryAddPlus}>+</Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Product info */}
      <View style={styles.groceryBody}>
        <Text style={styles.groceryName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.groceryUnit}>{sizeLabel}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.groceryPrice}>{formatCurrency(product.price)}</Text>
          {originalPrice ? (
            <Text style={styles.strike}>{formatCurrency(originalPrice)}</Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  groceryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
  },
  groceryImageWrap: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'visible',
    backgroundColor: IMAGE_BACKDROP,
    marginBottom: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: IMAGE_BACKDROP,
    borderRadius: 12,
  },
  fallbackEmoji: { fontSize: 36 },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#0C831F',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  groceryAddBtn: {
    position: 'absolute',
    bottom: -8,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 10,
  },
  groceryAddLabel: {
    color: ZEPTO_PINK,
    fontSize: 13,
    fontWeight: '700',
  },
  groceryAddPlus: {
    color: ZEPTO_PINK,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 20,
  },
  groceryStepper: {
    position: 'absolute',
    bottom: -8,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBCFE8',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    zIndex: 10,
  },
  groceryStepperBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  groceryStepperBtnPlus: {
    backgroundColor: ZEPTO_PINK,
  },
  groceryStepperSymbol: {
    color: ZEPTO_PINK,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  groceryStepperSymbolOnPink: {
    color: '#FFFFFF',
  },
  groceryStepperQty: {
    minWidth: 22,
    textAlign: 'center',
    color: ZEPTO_PINK,
    fontWeight: '700',
    fontSize: 14,
  },
  groceryBody: {
    flex: 1,
    paddingTop: 4,
  },
  groceryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: 18,
    minHeight: 40,
  },
  groceryUnit: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  groceryPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  strike: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },

  retailCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  retailImageWrap: { aspectRatio: 3 / 4, backgroundColor: '#F8F8F8' },
  retailImage: { width: '100%', height: '100%' },
  retailBody: { padding: 10, gap: 6 },
  retailName: { fontSize: 13, fontWeight: '700', color: '#1C1C1C', lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  sizeTag: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  colorTag: {
    fontSize: 9,
    fontWeight: '600',
    color: '#DB2777',
    backgroundColor: '#FCE7F3',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  retailPrice: { fontSize: 16, fontWeight: '800', color: '#1C1C1C' },
  retailAddBtn: {
    backgroundColor: '#FF3F6C',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retailAddText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  retailStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FF3F6C',
    borderRadius: 12,
    paddingVertical: 8,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepperBtnPlus: { backgroundColor: '#fff' },
  stepperBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  stepperBtnTextDark: { color: '#FF3F6C' },
  stepperQty: { color: '#fff', fontWeight: '700', fontSize: 14, minWidth: 20, textAlign: 'center' },
})
