/** Default delivery radius in km for new stores */
export const DEFAULT_DELIVERY_RADIUS_KM = 3;

/** Default minimum order value in INR */
export const DEFAULT_MIN_ORDER_VALUE = 0;

/** Platform USP: 0% commission on product sales at launch */
export const PRODUCT_COMMISSION_PERCENT = 0;

/** JWT default expiry */
export const JWT_DEFAULT_EXPIRES_IN = "7d";

/** API pagination defaults */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Redis key prefixes */
export const REDIS_KEYS = {
  storeOpen: (storeId: string) => `store:${storeId}:open`,
  orderStatus: (orderId: string) => `order:${orderId}:status`,
  riderLocation: (rabbitorId: string) => `rabbitor:${rabbitorId}:location`,
} as const;
