export type UpiApp = 'gpay' | 'phonepe' | 'paytm' | 'generic'

export function buildUpiPayUrl(params: {
  vpa: string
  payeeName: string
  amount: number
  transactionNote: string
  app?: UpiApp
}): string {
  const query = new URLSearchParams({
    pa: params.vpa,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: 'INR',
    tn: params.transactionNote.slice(0, 80),
  })
  const base = query.toString()

  switch (params.app) {
    case 'gpay':
      return `tez://upi/pay?${base}`
    case 'phonepe':
      return `phonepe://pay?${base}`
    case 'paytm':
      return `paytmmp://pay?${base}`
    default:
      return `upi://pay?${base}`
  }
}

export function getMerchantUpiVpa(): string {
  return (
    process.env.NEXT_PUBLIC_MERCHANT_UPI_VPA ??
    process.env.MERCHANT_UPI_VPA ??
    ''
  ).trim()
}
