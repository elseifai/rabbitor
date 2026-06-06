/** Platform user roles */
export enum UserRole {
  CUSTOMER = "CUSTOMER",
  VENDOR = "VENDOR",
  RABBITOR = "RABBITOR",
  ADMIN = "ADMIN",
}

/** Local store categories */
export enum StoreType {
  KIRANA = "KIRANA",
  FISH = "FISH",
  VEGETABLE = "VEGETABLE",
  PHARMACY = "PHARMACY",
  BAKERY = "BAKERY",
  DAIRY = "DAIRY",
  MEAT = "MEAT",
  GENERAL = "GENERAL",
}

/** How an order is fulfilled */
export enum DeliveryMethod {
  SELF = "SELF",
  RABBITOR = "RABBITOR",
  THIRD_PARTY = "THIRD_PARTY",
}

/** Order lifecycle */
export enum OrderStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  PREPARING = "PREPARING",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

/** Vendor subscription tiers */
export enum SubscriptionTier {
  FREE = "FREE",
  SILVER = "SILVER",
  GOLD = "GOLD",
  PLATINUM = "PLATINUM",
}

/** KYC verification state (backend only — never expose PAN/GST on UI) */
export enum KycStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

/** Supported regional languages */
export enum Locale {
  EN = "en",
  HI = "hi",
  MR = "mr",
  TA = "ta",
  TE = "te",
  BN = "bn",
}
