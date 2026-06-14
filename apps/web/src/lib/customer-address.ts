export type AddressLabel = 'HOME' | 'WORK' | 'OTHER'

export interface CustomerAddressRecord {
  id: string
  label: AddressLabel
  customLabel: string | null
  line1: string
  line2: string | null
  landmark: string | null
  area: string | null
  city: string
  pincode: string | null
  latitude: number
  longitude: number
  isDefault: boolean
}

export function addressLabelDisplay(addr: Pick<CustomerAddressRecord, 'label' | 'customLabel'>): string {
  if (addr.label === 'OTHER' && addr.customLabel?.trim()) return addr.customLabel.trim()
  if (addr.label === 'HOME') return 'Home'
  if (addr.label === 'WORK') return 'Work'
  return 'Other'
}

export function formatCustomerAddress(
  addr: Pick<
    CustomerAddressRecord,
    'line1' | 'line2' | 'landmark' | 'area' | 'city' | 'pincode'
  >,
): string {
  return [addr.line1, addr.line2, addr.landmark, addr.area, addr.city, addr.pincode]
    .filter((part) => part?.trim())
    .join(', ')
}

export function formatAddressShort(addr: CustomerAddressRecord): string {
  const areaPart = addr.area || addr.line2 || addr.city
  return `${addr.line1}${areaPart ? `, ${areaPart}` : ''}`
}
