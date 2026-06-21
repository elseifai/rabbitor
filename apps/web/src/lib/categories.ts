export const HOME_CATEGORY_TABS = [
  { id: 'all', label: 'All 🏠', storeType: undefined },
  { id: 'kirana', label: 'Kirana 🛒', storeType: 'KIRANA' },
  { id: 'fish', label: 'Fish 🐟', storeType: 'FISH' },
  { id: 'veggies', label: 'Veggies 🥦', storeType: 'VEGETABLE' },
  { id: 'pharmacy', label: 'Pharmacy 💊', storeType: 'PHARMACY' },
  { id: 'dairy', label: 'Dairy 🥛', storeType: 'DAIRY' },
  { id: 'meat', label: 'Meat 🥩', storeType: 'MEAT' },
  { id: 'bakery', label: 'Bakery 🍞', storeType: 'BAKERY' },
  { id: 'general', label: 'General 📦', storeType: 'GENERAL' },
] as const

export type HomeCategoryId = (typeof HOME_CATEGORY_TABS)[number]['id']

/** Category tabs shown on the dedicated Stores (marketplace) grid. */
export const MARKETPLACE_CATEGORY_TABS = HOME_CATEGORY_TABS.filter(
  (t) =>
    t.id === 'all' ||
    t.id === 'bakery' ||
    t.id === 'general',
)

export const STORE_TYPE_LINK: Record<string, string> = {
  KIRANA: 'kirana',
  FISH: 'fish',
  VEGETABLE: 'veggies',
  PHARMACY: 'pharmacy',
  DAIRY: 'dairy',
  MEAT: 'meat',
  BAKERY: 'bakery',
  GENERAL: 'general',
}
