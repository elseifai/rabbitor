export interface MerchantNewOrderPayload {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  status: string;
  totalPrice: number;
  deliveryFee: number;
  itemCount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  customerPhone: string;
  createdAt: string;
  requiresAck: true;
  ackDeadlineSeconds: number;
}
