// Rabbitor mobile design tokens (kept in sync with tailwind.config.js)
export const colors = {
  brand: '#FF6B35',
  brandDark: '#F04E12',
  brandTint: '#FFF3EE',
  success: '#0C831F',
  ink: '#1C1C1C',
  inkMuted: '#6B7280',
  inkFaint: '#9CA3AF',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  line: '#EEF0F2',
}

export type StoreMeta = { emoji: string; label: string; tint: string }

export const STORE_META: Record<string, StoreMeta> = {
  KIRANA: { emoji: '🛒', label: 'Kirana', tint: '#FFF3EE' },
  FISH: { emoji: '🐟', label: 'Fish', tint: '#E6F4FB' },
  VEGETABLE: { emoji: '🥦', label: 'Veggies', tint: '#E9F8EC' },
  PHARMACY: { emoji: '💊', label: 'Pharmacy', tint: '#FDE8E8' },
  DAIRY: { emoji: '🥛', label: 'Dairy', tint: '#FEF6E0' },
  BAKERY: { emoji: '🍞', label: 'Bakery', tint: '#FBEFD8' },
  MEAT: { emoji: '🍖', label: 'Meat', tint: '#FBE6E6' },
  GENERAL: { emoji: '🏪', label: 'Store', tint: '#F1F5F9' },
}

export function storeMeta(type?: string): StoreMeta {
  return STORE_META[type ?? ''] ?? STORE_META.GENERAL
}

// Rough ETA from distance (km). Local-vendor delivery ~ prep + travel.
export function etaMinutes(distanceKm?: number): number {
  const km = distanceKm ?? 1.5
  return Math.max(8, Math.round(8 + km * 6))
}
