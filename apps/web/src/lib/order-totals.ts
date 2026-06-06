export function orderGrandTotal(order: {
  totalPrice: number
  deliveryFee: number
  riderTip?: number | null
}): number {
  return order.totalPrice + order.deliveryFee + (order.riderTip ?? 0)
}
