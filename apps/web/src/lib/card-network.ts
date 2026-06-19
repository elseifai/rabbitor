export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'unknown'

export function detectCardNetwork(raw: string): CardNetwork {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 'unknown'
  if (/^4/.test(digits)) return 'visa'
  if (/^3[47]/.test(digits)) return 'amex'
  if (/^(508[5-9]|60|65|81|82)/.test(digits)) return 'rupay'
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits)) return 'mastercard'
  return 'unknown'
}

export const CARD_NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  rupay: 'RuPay',
  amex: 'Amex',
  unknown: '',
}
