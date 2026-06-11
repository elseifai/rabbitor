export type RiderDeliveryStage =
  | "ASSIGNED"
  | "ARRIVED_AT_STORE"
  | "PICKED_UP"
  | "DELIVERED";

export interface DeliveryOfferPayload {
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeLat: number;
  storeLng: number;
  destLat: number | null;
  destLng: number | null;
  payoutInr: number;
  expiresInSeconds: number;
  requiresAccept: true;
}
